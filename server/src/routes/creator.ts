import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import {
  getCreatorForUser,
  requireAuth,
  requireApprovedCreator,
  requireCreator,
  type AuthRequest,
} from '../middleware/auth.js'
import { mapContent, serializeSubtitles, slugify } from '../mappers.js'
import { normalizeContentType } from '../constants/contentTypes.js'
import { parseContentAddedAt } from '../services/license.js'
import type { ContentRow, CreatorRow } from '../types.js'

const router = Router()

interface CreatorAuthRequest extends AuthRequest {
  creator?: CreatorRow
}

function getCreatorProfile(userId: string) {
  const user = dbGet('SELECT id, name, email, role FROM users WHERE id = ?', [userId])
  const creator = getCreatorForUser(userId)
  if (!user || !creator) return null

  const documents = dbAll<{
    id: string
    doc_type: string
    file_url: string
    uploaded_at: string
  }>('SELECT id, doc_type, file_url, uploaded_at FROM creator_documents WHERE creator_id = ? ORDER BY uploaded_at DESC', [
    creator.id,
  ])

  return {
    user,
    creator: {
      id: creator.id,
      studioName: creator.studio_name,
      bio: creator.bio,
      status: creator.status,
      legalAcceptedAt: creator.legal_accepted_at,
      createdAt: creator.created_at,
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      docType: doc.doc_type,
      fileUrl: doc.file_url,
      uploadedAt: doc.uploaded_at,
    })),
  }
}

router.get('/me', requireCreator, (req: AuthRequest, res) => {
  const profile = getCreatorProfile(req.auth!.userId)
  if (!profile) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }
  res.json(profile)
})

router.get('/dashboard', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const contentRows = dbAll<ContentRow>(
    'SELECT * FROM content WHERE creator_id = ? ORDER BY content_added_at DESC',
    [creator.id],
  )

  const stats = dbAll<{
    content_id: string
    qualified_seconds: number
    likes: number
  }>(
    `SELECT
      c.id AS content_id,
      COALESCE(SUM(cqa.seconds_watched), 0) AS qualified_seconds,
      COALESCE((
        SELECT COUNT(*) FROM content_reactions cr
        WHERE cr.content_id = c.id AND cr.reaction = 'like'
      ), 0) AS likes
    FROM content c
    LEFT JOIN creator_qualified_activity cqa ON cqa.content_id = c.id AND cqa.creator_id = c.creator_id
    WHERE c.creator_id = ?
    GROUP BY c.id`,
    [creator.id],
  )

  const statsByContent = new Map(stats.map((row) => [row.content_id, row]))

  const documents = dbAll<{ id: string }>('SELECT id FROM creator_documents WHERE creator_id = ?', [creator.id])

  res.json({
    creator: {
      id: creator.id,
      studioName: creator.studio_name,
      status: creator.status,
      documentCount: documents.length,
    },
    payoutRules: {
      note: 'Kazançlar yapımcı anlaşmasında belirtilen adil paylaşım modeline göre hesaplanır.',
    },
    content: contentRows.map((row) => {
      const stat = statsByContent.get(row.id)
      return {
        ...mapContent(row),
        reviewStatus: row.review_status ?? 'pending',
        qualifiedMinutes: Math.round((stat?.qualified_seconds ?? 0) / 60),
        likes: stat?.likes ?? 0,
      }
    }),
    totals: {
      qualifiedMinutes: Math.round(
        stats.reduce((sum, row) => sum + row.qualified_seconds, 0) / 60,
      ),
      likes: stats.reduce((sum, row) => sum + row.likes, 0),
      publishedCount: contentRows.filter((row) => row.review_status === 'published').length,
      pendingCount: contentRows.filter((row) => row.review_status === 'pending').length,
    },
  })
})

router.post('/documents', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const docType = String(req.body.docType ?? 'ownership').trim()
  const fileUrl = String(req.body.fileUrl ?? '').trim()

  if (!fileUrl) {
    res.status(400).json({ error: 'Belge URL gerekli.' })
    return
  }

  const id = uuid()
  const now = new Date().toISOString()
  dbRun(
    'INSERT INTO creator_documents (id, creator_id, doc_type, file_url, uploaded_at) VALUES (?, ?, ?, ?, ?)',
    [id, creator.id, docType, fileUrl, now],
  )

  res.status(201).json({
    document: { id, docType, fileUrl, uploadedAt: now },
  })
})

router.delete('/documents/:id', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const doc = dbGet('SELECT id FROM creator_documents WHERE id = ? AND creator_id = ?', [
    req.params.id,
    creator.id,
  ])
  if (!doc) {
    res.status(404).json({ error: 'Belge bulunamadı.' })
    return
  }

  dbRun('DELETE FROM creator_documents WHERE id = ?', [req.params.id])
  res.status(204).send()
})

router.get('/content', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const rows = dbAll<ContentRow>('SELECT * FROM content WHERE creator_id = ? ORDER BY title', [creator.id])
  res.json({ items: rows.map(mapContent) })
})

router.post('/content', requireApprovedCreator, (req: CreatorAuthRequest, res) => {
  const creator = req.creator!
  const body = req.body as Record<string, unknown>

  const docCount = dbGet<{ count: number }>(
    'SELECT COUNT(*) AS count FROM creator_documents WHERE creator_id = ?',
    [creator.id],
  )
  if (!docCount || docCount.count < 1) {
    res.status(400).json({
      error: 'İçerik göndermeden önce en az bir telif / mülkiyet belgesi yüklemelisiniz.',
    })
    return
  }

  const title = String(body.title ?? '').trim()
  if (!title) {
    res.status(400).json({ error: 'Başlık zorunlu.' })
    return
  }

  const videoUrl = String(body.videoUrl ?? body.video_url ?? '').trim()
  if (!videoUrl) {
    res.status(400).json({ error: 'Video URL veya dosya zorunlu.' })
    return
  }

  let id = body.id ? String(body.id) : slugify(title)
  let counter = 1
  while (dbGet('SELECT id FROM content WHERE id = ?', [id])) {
    id = `${slugify(title)}-${counter++}`
  }

  const type = normalizeContentType(body.type, 'film')
  const now = new Date().toISOString()

  dbRun(
    `INSERT INTO content (
      id, title, description, year, duration, rating, type, genres, poster, backdrop,
      video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured,
      subtitles_json, credits_json, content_added_at, license_expires_at, published_at,
      creator_id, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      String(body.description ?? '').trim(),
      Number(body.year ?? new Date().getFullYear()),
      String(body.duration ?? '').trim(),
      String(body.rating ?? '13+').trim(),
      type,
      JSON.stringify(body.genres ?? []),
      String(body.poster ?? '').trim(),
      String(body.backdrop ?? body.poster ?? '').trim(),
      videoUrl,
      String(body.streamProvider ?? body.stream_provider ?? 'custom'),
      String(body.trailerUrl ?? body.trailer_url ?? ''),
      String(body.videoFormat ?? body.video_format ?? 'standard'),
      0,
      null,
      0,
      serializeSubtitles(body.subtitles ?? []),
      '{}',
      parseContentAddedAt(now),
      null,
      null,
      creator.id,
      'pending',
    ],
  )

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [id])!
  res.status(201).json({
    item: mapContent(row),
    reviewStatus: 'pending',
    message: 'İçeriğiniz incelemeye gönderildi. Onaylandıktan sonra yayınlanacaktır.',
  })
})

router.patch('/content/:id', requireApprovedCreator, (req: CreatorAuthRequest, res) => {
  const creator = req.creator!
  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND creator_id = ?', [
    req.params.id,
    creator.id,
  ])
  if (!existing) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }

  if (existing.review_status === 'published') {
    res.status(400).json({ error: 'Yayınlanmış içerik düzenlenemez. Destek ile iletişime geçin.' })
    return
  }

  const body = req.body as Record<string, unknown>
  dbRun(
    `UPDATE content SET
      title = ?, description = ?, year = ?, duration = ?, rating = ?, type = ?,
      genres = ?, poster = ?, backdrop = ?, video_url = ?, review_status = ?
    WHERE id = ? AND creator_id = ?`,
    [
      body.title !== undefined ? String(body.title) : existing.title,
      body.description !== undefined ? String(body.description) : existing.description,
      body.year !== undefined ? Number(body.year) : existing.year,
      body.duration !== undefined ? String(body.duration) : existing.duration,
      body.rating !== undefined ? String(body.rating) : existing.rating,
      body.type !== undefined ? normalizeContentType(body.type, existing.type) : existing.type,
      body.genres !== undefined ? JSON.stringify(body.genres) : existing.genres,
      body.poster !== undefined ? String(body.poster) : existing.poster,
      body.backdrop !== undefined ? String(body.backdrop) : existing.backdrop,
      body.videoUrl !== undefined ? String(body.videoUrl) : existing.video_url,
      'pending',
      existing.id,
      creator.id,
    ],
  )

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  res.json({ item: mapContent(row), reviewStatus: 'pending' })
})

export default router
