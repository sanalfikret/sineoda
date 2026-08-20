import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapContent } from '../mappers.js'
import type { ContentRow, CreatorRow } from '../types.js'

const router = Router()

router.get('/creators', requireAdmin, (_req: AuthRequest, res) => {
  const rows = dbAll<
    CreatorRow & { user_name: string; user_email: string; document_count: number; content_count: number }
  >(
    `SELECT c.*, u.name AS user_name, u.email AS user_email,
      (SELECT COUNT(*) FROM creator_documents cd WHERE cd.creator_id = c.id) AS document_count,
      (SELECT COUNT(*) FROM content co WHERE co.creator_id = c.id) AS content_count
    FROM creators c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC`,
  )

  res.json({
    creators: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.user_name,
      email: row.user_email,
      studioName: row.studio_name,
      bio: row.bio,
      status: row.status,
      legalAcceptedAt: row.legal_accepted_at,
      createdAt: row.created_at,
      documentCount: row.document_count,
      contentCount: row.content_count,
    })),
  })
})

router.get('/creators/:id', requireAdmin, (req: AuthRequest, res) => {
  const row = dbGet<
    CreatorRow & { user_name: string; user_email: string; user_created_at: string }
  >(
    `SELECT c.*, u.name AS user_name, u.email AS user_email, u.created_at AS user_created_at
     FROM creators c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ?`,
    [req.params.id],
  )

  if (!row) {
    res.status(404).json({ error: 'Yapımcı bulunamadı.' })
    return
  }

  const documents = dbAll<{
    id: string
    doc_type: string
    file_url: string
    uploaded_at: string
  }>('SELECT id, doc_type, file_url, uploaded_at FROM creator_documents WHERE creator_id = ? ORDER BY uploaded_at DESC', [
    row.id,
  ])

  const contentRows = dbAll<ContentRow>(
    'SELECT * FROM content WHERE creator_id = ? ORDER BY content_added_at DESC',
    [row.id],
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
    [row.id],
  )

  const statsByContent = new Map(stats.map((entry) => [entry.content_id, entry]))

  res.json({
    creator: {
      id: row.id,
      userId: row.user_id,
      name: row.user_name,
      email: row.user_email,
      studioName: row.studio_name,
      bio: row.bio,
      status: row.status,
      legalAcceptedAt: row.legal_accepted_at,
      createdAt: row.created_at,
      userCreatedAt: row.user_created_at,
      documentCount: documents.length,
      contentCount: contentRows.length,
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      docType: doc.doc_type,
      fileUrl: doc.file_url,
      uploadedAt: doc.uploaded_at,
    })),
    content: contentRows.map((item) => {
      const stat = statsByContent.get(item.id)
      return {
        ...mapContent(item),
        reviewStatus: item.review_status ?? 'pending',
        qualifiedMinutes: Math.round((stat?.qualified_seconds ?? 0) / 60),
        likes: stat?.likes ?? 0,
      }
    }),
  })
})

router.patch('/creators/:id', requireAdmin, (req: AuthRequest, res) => {
  const status = String(req.body.status ?? '').trim()
  if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
    res.status(400).json({ error: 'Geçersiz durum.' })
    return
  }

  const creator = dbGet<CreatorRow>('SELECT * FROM creators WHERE id = ?', [req.params.id])
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı bulunamadı.' })
    return
  }

  dbRun('UPDATE creators SET status = ? WHERE id = ?', [status, creator.id])
  res.json({ ok: true, status })
})

router.get('/content/pending', requireAdmin, (_req: AuthRequest, res) => {
  const rows = dbAll<ContentRow & { studio_name: string }>(
    `SELECT c.*, cr.studio_name
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     WHERE c.review_status = 'pending'
     ORDER BY c.content_added_at DESC`,
  )

  res.json({
    items: rows.map((row) => ({
      ...mapContent(row),
      reviewStatus: row.review_status,
      studioName: row.studio_name,
    })),
  })
})

router.patch('/content/:id/review', requireAdmin, (req: AuthRequest, res) => {
  const reviewStatus = String(req.body.reviewStatus ?? req.body.status ?? '').trim()
  if (!['published', 'rejected', 'pending'].includes(reviewStatus)) {
    res.status(400).json({ error: 'Geçersiz inceleme durumu.' })
    return
  }

  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }

  const publishedAt =
    reviewStatus === 'published'
      ? existing.published_at ?? new Date().toISOString()
      : reviewStatus === 'rejected'
        ? null
        : existing.published_at

  dbRun('UPDATE content SET review_status = ?, published_at = ? WHERE id = ?', [
    reviewStatus,
    publishedAt,
    existing.id,
  ])

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  res.json({ item: mapContent(row), reviewStatus })
})

export default router
