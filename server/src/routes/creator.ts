import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { BRAND_NAME } from '../constants/brand.js'
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
import { serializeCredits, validateApplicationCredits } from '../services/credits.js'
import { parseFestivalsBody, serializeFestivals } from '../services/festivals.js'
import { resolveDurationFields } from '../services/duration.js'
import {
  creatorHasBaseDocuments,
  linkApplicationDocuments,
  saveApplicationDeclaration,
  validateFilmApplication,
} from '../services/filmApplication.js'
import { getContentEngagementStats } from '../services/studentCinema.js'
import { getMonthlyReport, monthKey } from '../services/watchAccounting.js'
import { isCreatorRegistrationPaid } from '../services/creatorRegistration.js'
import {
  countUnreadMessages,
  listUserMessages,
  markMessageRead,
} from '../services/userMessages.js'
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
      program: creator.program ?? 'standard',
      schoolId: creator.school_id ?? null,
      registrationPaidAt: creator.registration_paid_at ?? null,
      registrationPaid: isCreatorRegistrationPaid(creator),
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

  const engagementStats = getContentEngagementStats(contentRows.map((row) => row.id))
  const documents = dbAll<{ id: string }>('SELECT id FROM creator_documents WHERE creator_id = ?', [creator.id])

  res.json({
    creator: {
      id: creator.id,
      studioName: creator.studio_name,
      status: creator.status,
      documentCount: documents.length,
      program: creator.program ?? 'standard',
      schoolId: creator.school_id ?? null,
      registrationPaidAt: creator.registration_paid_at ?? null,
      registrationPaid: isCreatorRegistrationPaid(creator),
    },
    payoutRules: {
      note: 'Kazançlar yapımcı anlaşmasında belirtilen adil paylaşım modeline göre hesaplanır.',
    },
    content: contentRows.map((row) => {
      const stat = engagementStats.get(row.id)
      return {
        ...mapContent(row),
        reviewStatus: row.review_status ?? 'pending',
        program: row.program ?? 'standard',
        contentFormat: row.content_format ?? 'main',
        parentContentId: row.parent_content_id ?? null,
        schoolReviewStatus: row.school_review_status ?? 'none',
        qualifiedMinutes: stat?.qualifiedMinutes ?? 0,
        watchMinutes: stat?.watchMinutes ?? 0,
        likes: stat?.likes ?? 0,
        viewers: stat?.viewers ?? 0,
      }
    }),
    totals: {
      qualifiedMinutes: [...engagementStats.values()].reduce((sum, row) => sum + row.qualifiedMinutes, 0),
      watchMinutes: [...engagementStats.values()].reduce((sum, row) => sum + row.watchMinutes, 0),
      likes: [...engagementStats.values()].reduce((sum, row) => sum + row.likes, 0),
      viewers: [...engagementStats.values()].reduce((sum, row) => sum + row.viewers, 0),
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

  const contentFormat = String(body.contentFormat ?? body.content_format ?? 'main').trim()
  const isMainApplication = contentFormat === 'main'
  let application: ReturnType<typeof validateFilmApplication> | null = null

  if (isMainApplication) {
    try {
      application = validateFilmApplication(body, creator.id)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Başvuru doğrulanamadı.' })
      return
    }
  } else if (!creatorHasBaseDocuments(creator.id)) {
    res.status(400).json({
      error: 'Ek içerik göndermeden önce hesabınıza yönetmen / yapımcı belgesi eklemelisiniz.',
    })
    return
  }

  const title = String(body.title ?? '').trim()
  if (!title) {
    res.status(400).json({ error: 'Başlık zorunlu.' })
    return
  }

  const downloadLink = String(
    body.downloadLink ?? body.sourceVideoUrl ?? body.source_video_url ?? '',
  ).trim()

  if (isMainApplication && !downloadLink) {
    res.status(400).json({ error: 'Film indirme linki zorunludur.' })
    return
  }

  if (isMainApplication && body.credits !== undefined) {
    try {
      validateApplicationCredits(body.credits)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Film künyesi eksik.' })
      return
    }
  } else if (isMainApplication) {
    res.status(400).json({ error: 'Film künyesi (yönetmen, yapımcı, oyuncu kadrosu) zorunludur.' })
    return
  }

  const videoUrl = String(body.videoUrl ?? body.video_url ?? '').trim() || downloadLink
  if (!videoUrl) {
    res.status(400).json({ error: 'Film indirme linki veya video dosyası zorunlu.' })
    return
  }

  let id = body.id ? String(body.id) : slugify(title)
  let counter = 1
  while (dbGet('SELECT id FROM content WHERE id = ?', [id])) {
    id = `${slugify(title)}-${counter++}`
  }

  const type = normalizeContentType(body.type, 'film')
  const now = new Date().toISOString()
  const isStudentProgram = (creator.program ?? 'standard') === 'student_cinema'
  const parentContentId = String(body.parentContentId ?? body.parent_content_id ?? '').trim() || null

  if (!['main', 'bts', 'teacher_note'].includes(contentFormat)) {
    res.status(400).json({ error: 'Geçersiz içerik formatı.' })
    return
  }

  if (isStudentProgram) {
    if (!creator.school_id) {
      res.status(400).json({ error: 'Genç Sinema başvurusu için okul seçimi zorunludur.' })
      return
    }
    if (contentFormat !== 'main' && !parentContentId) {
      res.status(400).json({ error: 'Kamera arkası veya hoca notu için ana film seçmelisiniz.' })
      return
    }
    if (parentContentId) {
      const parent = dbGet<ContentRow>(
        'SELECT * FROM content WHERE id = ? AND creator_id = ? AND content_format = ?',
        [parentContentId, creator.id, 'main'],
      )
      if (!parent) {
        res.status(400).json({ error: 'Bağlı ana film bulunamadı.' })
        return
      }
    }
  } else if (contentFormat !== 'main' || parentContentId) {
    res.status(400).json({ error: 'Kamera arkası yalnızca Genç Sinema programında kullanılabilir.' })
    return
  }

  const program = isStudentProgram ? 'student_cinema' : 'standard'
  const schoolId = isStudentProgram ? creator.school_id : null
  const schoolReviewStatus = isStudentProgram ? 'pending' : 'none'
  const durationFields = resolveDurationFields(body)
  const festivalsJson = serializeFestivals(parseFestivalsBody(body) ?? [])

  dbRun(
    `INSERT INTO content (
      id, title, description, year, duration, duration_minutes, rating, type, genres, poster, backdrop,
      video_url, source_video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured,
      subtitles_json, credits_json, festivals_json, content_added_at, license_expires_at, published_at,
      creator_id, review_status, program, content_format, parent_content_id, school_id, school_review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      String(body.description ?? '').trim(),
      Number(body.year ?? new Date().getFullYear()),
      durationFields.duration,
      durationFields.durationMinutes,
      String(body.rating ?? '13+').trim(),
      type,
      JSON.stringify(body.genres ?? []),
      String(body.poster ?? '').trim(),
      String(body.backdrop ?? body.poster ?? '').trim(),
      videoUrl,
      downloadLink || videoUrl,
      String(body.streamProvider ?? body.stream_provider ?? 'custom'),
      String(body.trailerUrl ?? body.trailer_url ?? ''),
      String(body.videoFormat ?? body.video_format ?? 'standard'),
      0,
      null,
      0,
      serializeSubtitles(body.subtitles ?? []),
      body.credits !== undefined ? serializeCredits(body.credits) : '{}',
      festivalsJson,
      parseContentAddedAt(now),
      null,
      null,
      creator.id,
      'pending',
      program,
      contentFormat,
      parentContentId,
      schoolId,
      schoolReviewStatus,
    ],
  )

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [id])!

  if (application) {
    linkApplicationDocuments(id, creator.id, application.documentIds)
    saveApplicationDeclaration(id, application.declaration)
  }

  res.status(201).json({
    item: mapContent(row),
    reviewStatus: 'pending',
    program,
    contentFormat,
    schoolReviewStatus,
    message: isStudentProgram
      ? `Film başvurunuz okul onayına gönderildi. Okul onayından sonra ${BRAND_NAME} incelemesine alınır.`
      : 'Film başvurunuz incelemeye gönderildi. Onaylandıktan sonra yayınlanacaktır.',
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
  const nextVideoUrl = body.videoUrl !== undefined ? String(body.videoUrl).trim() : existing.video_url
  const durationFields = resolveDurationFields(body, existing)
  const festivalsParsed = parseFestivalsBody(body)
  dbRun(
    `UPDATE content SET
      title = ?, description = ?, year = ?, duration = ?, duration_minutes = ?, rating = ?, type = ?,
      genres = ?, poster = ?, backdrop = ?, video_url = ?, source_video_url = ?, credits_json = ?, festivals_json = ?, review_status = ?
    WHERE id = ? AND creator_id = ?`,
    [
      body.title !== undefined ? String(body.title) : existing.title,
      body.description !== undefined ? String(body.description) : existing.description,
      body.year !== undefined ? Number(body.year) : existing.year,
      durationFields.duration,
      durationFields.durationMinutes,
      body.rating !== undefined ? String(body.rating) : existing.rating,
      body.type !== undefined ? normalizeContentType(body.type, existing.type) : existing.type,
      body.genres !== undefined ? JSON.stringify(body.genres) : existing.genres,
      body.poster !== undefined ? String(body.poster) : existing.poster,
      body.backdrop !== undefined ? String(body.backdrop) : existing.backdrop,
      nextVideoUrl,
      nextVideoUrl,
      body.credits !== undefined ? serializeCredits(body.credits) : existing.credits_json ?? '{}',
      festivalsParsed !== undefined
        ? serializeFestivals(festivalsParsed)
        : existing.festivals_json ?? '[]',
      'pending',
      existing.id,
      creator.id,
    ],
  )

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  res.json({ item: mapContent(row), reviewStatus: 'pending' })
})

router.get('/accounting/months', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const archived = dbAll<{ month: string }>(
    'SELECT DISTINCT month FROM content_watch_monthly WHERE creator_id = ? ORDER BY month DESC',
    [creator.id],
  )
  const current = monthKey()
  const months = new Set(archived.map((row) => row.month))
  months.add(current)
  res.json({
    months: [...months].sort((a, b) => b.localeCompare(a)).map((month) => ({
      month,
      status: month === current ? 'open' : 'closed',
    })),
  })
})

router.get('/accounting', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  try {
    const month = String(req.query.month ?? monthKey()).trim()
    const report = getMonthlyReport(month, { creatorId: creator.id })
    res.json({
      month: report.month,
      status: report.status,
      totalQualifiedMinutes: report.totalQualifiedMinutes,
      totalWatchMinutes: report.totalWatchMinutes,
      items: report.items.map((item) => ({
        contentId: item.contentId,
        title: item.title,
        type: item.type,
        program: item.program,
        qualifiedMinutes: item.qualifiedMinutes,
        watchMinutes: item.watchMinutes,
        viewerCount: item.viewerCount,
      })),
    })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Muhasebe verisi yüklenemedi.' })
  }
})

router.get('/messages', requireCreator, (req: AuthRequest, res) => {
  res.json({ messages: listUserMessages(req.auth!.userId) })
})

router.get('/messages/unread-count', requireCreator, (req: AuthRequest, res) => {
  res.json({ count: countUnreadMessages(req.auth!.userId) })
})

router.patch('/messages/:id/read', requireCreator, (req: AuthRequest, res) => {
  try {
    const message = markMessageRead(req.auth!.userId, req.params.id)
    res.json({ message })
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Mesaj bulunamadı.' })
  }
})

export default router
