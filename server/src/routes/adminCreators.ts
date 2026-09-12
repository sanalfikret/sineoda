import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { dbAll, dbGet, dbRun, dbTransaction, uploadsDir } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapContent, mapContentAdmin } from '../mappers.js'
import { addToGencSinemaCategory, isStudentMainRow } from '../services/studentCinema.js'
import { getContentApplicationDocuments } from '../services/filmApplication.js'
import {
  applyCreatorReviewStatus,
  resolveCreatorPublishUpdate,
  updateCreatorContentFields,
} from '../services/creatorContentAdmin.js'
import { attachStats, getContentEngagementStats } from '../services/studentCinema.js'
import { notifyCreatorFilmReview } from '../services/creatorNotifications.js'
import { isCreatorRegistrationPaid } from '../services/creatorRegistration.js'
import { splitCreatorName } from '../services/creatorProfile.js'
import { ensureCreatorChatTable } from '../services/creatorChat.js'
import type { ContentRow, CreatorRow } from '../types.js'

const router = Router()

function mapCreatorContentItem(row: ContentRow, stats?: ReturnType<typeof getContentEngagementStats> extends Map<string, infer V> ? V : never) {
  const sourceVideoUrl = row.source_video_url?.trim() || row.video_url
  return {
    ...mapContentAdmin(row),
    reviewStatus: row.review_status ?? 'pending',
    creatorId: row.creator_id ?? null,
    sourceVideoUrl,
    ...(stats ?? {
      qualifiedMinutes: 0,
      watchMinutes: 0,
      watchCount: 0,
      likes: 0,
      viewers: 0,
    }),
  }
}

function getStandardCreatorContent(contentId: string) {
  return dbGet<ContentRow>(
    `SELECT * FROM content
     WHERE id = ?
       AND creator_id IS NOT NULL
       AND COALESCE(NULLIF(program, ''), 'standard') = 'standard'`,
    [contentId],
  )
}

function publishPendingStandardFilms(creatorId: string, adminUserId: string) {
  const rows = dbAll<ContentRow>(
    `SELECT * FROM content
     WHERE creator_id = ?
       AND review_status = 'pending'
       AND COALESCE(NULLIF(program, ''), 'standard') = 'standard'`,
    [creatorId],
  )
  const now = new Date().toISOString()
  const publishedIds: string[] = []
  const skipped: Array<{ id: string; title: string; reason: string }> = []
  for (const row of rows) {
    try {
      applyCreatorReviewStatus(row, 'published', { publishedAt: now })
    } catch (err) {
      skipped.push({ id: row.id, title: row.title, reason: err instanceof Error ? err.message : 'Yayınlanamadı.' })
      continue
    }
    notifyCreatorFilmReview({
      content: row,
      reviewStatus: 'published',
      previousStatus: row.review_status ?? null,
      adminUserId,
    })
    publishedIds.push(row.id)
  }
  return { publishedIds, skipped }
}

const PROGRAMS = ['all', 'standard', 'student_cinema'] as const

function resolveProgramFilter(value: unknown) {
  const raw = String(value ?? 'all').trim()
  return (PROGRAMS as readonly string[]).includes(raw) ? raw : 'all'
}

type CreatorListRow = CreatorRow & {
  subscription_expires_at: string | null
  user_name: string
  user_email: string
  user_phone: string | null
  user_created_at: string
  school_name: string | null
  document_count: number
  content_count: number
  payment_pending_count: number
  unread_messages: number
}

const CREATOR_LIST_SELECT = `
  SELECT c.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
    u.created_at AS user_created_at, u.subscription_expires_at, fs.name AS school_name,
    (SELECT COUNT(*) FROM creator_documents cd WHERE cd.creator_id = c.id) AS document_count,
    (SELECT COUNT(*) FROM content co WHERE co.creator_id = c.id AND COALESCE(NULLIF(co.content_format, ''), 'main') = 'main') AS content_count,
    (SELECT COUNT(*) FROM content co WHERE co.creator_id = c.id AND co.review_status = 'payment_pending') AS payment_pending_count,
    (SELECT COUNT(*) FROM creator_chat m WHERE m.user_id = c.user_id AND m.from_admin = 0 AND m.read_at IS NULL) AS unread_messages
  FROM creators c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN film_schools fs ON fs.id = c.school_id
`

function mapCreatorListRow(row: CreatorListRow) {
  const names = splitCreatorName(row, row.user_name)
  return {
    id: row.id,
    userId: row.user_id,
    name: row.user_name,
    firstName: names.firstName,
    lastName: names.lastName,
    email: row.user_email,
    phone: row.user_phone ?? '',
    photoUrl: row.photo_url ?? '',
    studioName: row.studio_name,
    bio: row.bio,
    status: row.status,
    program: row.program ?? 'standard',
    schoolId: row.school_id ?? null,
    schoolName: row.school_name ?? '',
    studentApplicationType: row.student_application_type ?? null,
    studentDepartment: row.student_department ?? '',
    studentUniversity: row.student_university ?? '',
    projectCrew: row.project_crew ?? '',
    legalAcceptedAt: row.legal_accepted_at,
    createdAt: row.created_at,
    userCreatedAt: row.user_created_at,
    documentCount: row.document_count,
    contentCount: row.content_count,
    paymentPendingCount: row.payment_pending_count,
    unreadMessages: row.unread_messages,
    registrationPaidAt: row.registration_paid_at ?? null,
    subscriptionExpiresAt: row.subscription_expires_at ?? null,
    registrationPaid: isCreatorRegistrationPaid(row, {
      subscription_expires_at: row.subscription_expires_at ?? null,
    }),
  }
}

router.get('/creators', requireAdmin, (req: AuthRequest, res) => {
  ensureCreatorChatTable()
  const paymentFilter = String(req.query.payment ?? 'all').trim()
  const program = resolveProgramFilter(req.query.program)
  const rows = dbAll<CreatorListRow>(
    `${CREATOR_LIST_SELECT}
     ${program === 'all' ? '' : "WHERE COALESCE(c.program, 'standard') = ?"}
     ORDER BY u.name COLLATE NOCASE, c.created_at DESC`,
    program === 'all' ? [] : [program],
  )

  const creators = rows.map(mapCreatorListRow).filter((creator) => {
    if (paymentFilter === 'unpaid') return !creator.registrationPaid
    if (paymentFilter === 'paid') return creator.registrationPaid
    return true
  })

  res.json({ creators })
})

router.get('/creators/stats', requireAdmin, (req: AuthRequest, res) => {
  const program = resolveProgramFilter(req.query.program)
  const contentRows = dbAll<ContentRow>(
    `SELECT c.*
     FROM content c
     JOIN creators cr ON cr.id = c.creator_id
     WHERE COALESCE(NULLIF(c.content_format, ''), 'main') = 'main'
       ${program === 'all' ? '' : "AND COALESCE(cr.program, 'standard') = ?"}`,
    program === 'all' ? [] : [program],
  )
  const creatorCount =
    dbGet<{ count: number }>(
      `SELECT COUNT(*) AS count FROM creators ${program === 'all' ? '' : "WHERE COALESCE(program, 'standard') = ?"}`,
      program === 'all' ? [] : [program],
    )?.count ?? 0

  const statsMap = getContentEngagementStats(contentRows.map((row) => row.id))
  let watchMinutes = 0
  let qualifiedMinutes = 0
  let watchCount = 0
  let viewers = 0
  let likes = 0
  let publishedCount = 0
  let pendingCount = 0
  let paymentPendingCount = 0

  for (const row of contentRows) {
    const stats = statsMap.get(row.id)
    watchMinutes += stats?.watchMinutes ?? 0
    qualifiedMinutes += stats?.qualifiedMinutes ?? 0
    watchCount += stats?.watchCount ?? 0
    viewers += stats?.viewers ?? 0
    likes += stats?.likes ?? 0
    if (row.review_status === 'published') publishedCount += 1
    if (row.review_status === 'pending') pendingCount += 1
    if (row.review_status === 'payment_pending') paymentPendingCount += 1
  }

  res.json({
    stats: {
      creatorCount,
      filmCount: contentRows.length,
      watchMinutes,
      qualifiedMinutes,
      watchCount,
      viewers,
      likes,
      publishedCount,
      pendingCount,
      paymentPendingCount,
    },
  })
})

router.get('/creators/:id', requireAdmin, (req: AuthRequest, res) => {
  ensureCreatorChatTable()
  const row = dbGet<CreatorListRow>(`${CREATOR_LIST_SELECT} WHERE c.id = ?`, [req.params.id])

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

  const contentRows = dbAll<ContentRow & { school_name?: string | null; parent_title?: string | null }>(
    `SELECT c.*, fs.name AS school_name, parent.title AS parent_title
     FROM content c
     LEFT JOIN film_schools fs ON fs.id = c.school_id
     LEFT JOIN content parent ON parent.id = c.parent_content_id
     WHERE c.creator_id = ?
     ORDER BY c.content_added_at DESC`,
    [row.id],
  )

  const stats = getContentEngagementStats(contentRows.map((item) => item.id))
  const creator = mapCreatorListRow(row)

  res.json({
    creator: {
      ...creator,
      documentCount: documents.length,
      contentCount: contentRows.filter((item) => (item.content_format ?? 'main') === 'main').length,
      paymentPendingCount: contentRows.filter((item) => item.review_status === 'payment_pending').length,
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      docType: doc.doc_type,
      fileUrl: doc.file_url,
      uploadedAt: doc.uploaded_at,
    })),
    content: attachStats(
      contentRows.map((item) => ({
        ...mapContentAdmin(item),
        reviewStatus: item.review_status ?? 'pending',
        reviewNote: item.review_note ?? null,
        program: item.program ?? 'standard',
        contentFormat: item.content_format ?? 'main',
        parentContentId: item.parent_content_id ?? null,
        parentTitle: item.parent_title ?? null,
        schoolName: item.school_name ?? null,
        schoolReviewStatus: item.school_review_status ?? 'none',
        sourceVideoUrl: item.source_video_url?.trim() || item.video_url,
      })),
      stats,
    ),
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

  const publishedFilmIds: string[] = []

  res.json({ ok: true, status, publishedFilmIds, publishedCount: publishedFilmIds.length })
})

router.post('/creators/:id/publish-pending', requireAdmin, (req: AuthRequest, res) => {
  const creator = dbGet<CreatorRow>('SELECT * FROM creators WHERE id = ?', [req.params.id])
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı bulunamadı.' })
    return
  }

  const { publishedIds, skipped } = publishPendingStandardFilms(creator.id, req.auth!.userId)
  res.json({ ok: true, publishedFilmIds: publishedIds, publishedCount: publishedIds.length, skipped })
})

router.get('/content/pending', requireAdmin, (_req: AuthRequest, res) => {
  const rows = dbAll<ContentRow & { studio_name: string; creator_name: string }>(
    `SELECT c.*, cr.studio_name, u.name AS creator_name
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     LEFT JOIN users u ON u.id = cr.user_id
     WHERE c.review_status = 'pending'
       AND COALESCE(NULLIF(c.program, ''), 'standard') = 'standard'
       AND c.creator_id IS NOT NULL
     ORDER BY c.content_added_at DESC`,
  )

  res.json({
    items: rows.map((row) => ({
      ...mapContent(row),
      reviewStatus: row.review_status,
      studioName: row.studio_name,
      creatorName: row.creator_name,
    })),
  })
})

function resolveUploadFilePath(url: string) {
  const normalized = url.replace(/^\/uploads\//, '')
  const filePath = path.join(uploadsDir, normalized)
  if (!filePath.startsWith(uploadsDir)) return null
  return fs.existsSync(filePath) ? filePath : null
}

router.get('/content/:id/source-download', requireAdmin, (req: AuthRequest, res) => {
  const existing = getStandardCreatorContent(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Yapımcı filmi bulunamadı.' })
    return
  }

  const sourceUrl = existing.source_video_url?.trim() || existing.video_url
  if (!sourceUrl) {
    res.status(404).json({ error: 'Kaynak video linki yok.' })
    return
  }

  if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
    res.json({ url: sourceUrl, external: true })
    return
  }

  const filePath = resolveUploadFilePath(sourceUrl)
  if (!filePath) {
    res.status(404).json({ error: 'Video dosyası bulunamadı.' })
    return
  }

  res.download(filePath, path.basename(filePath))
})

router.get('/content/:id', requireAdmin, (req: AuthRequest, res) => {
  const row = dbGet<
    ContentRow & { studio_name: string | null; creator_name: string | null; creator_email: string | null }
  >(
    `SELECT c.*, cr.studio_name, u.name AS creator_name, u.email AS creator_email
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     LEFT JOIN users u ON u.id = cr.user_id
     WHERE c.id = ? AND c.creator_id IS NOT NULL AND COALESCE(NULLIF(c.program, ''), 'standard') = 'standard'`,
    [req.params.id],
  )

  if (!row) {
    res.status(404).json({ error: 'Yapımcı filmi bulunamadı.' })
    return
  }

  const stats = getContentEngagementStats([row.id]).get(row.id)
  let applicationDeclaration = null
  if (row.application_declaration_json) {
    try {
      applicationDeclaration = JSON.parse(row.application_declaration_json)
    } catch {
      applicationDeclaration = null
    }
  }
  const applicationDocuments = row.creator_id
    ? getContentApplicationDocuments(row.id, row.creator_id).map((doc) => ({
        id: doc.id,
        docType: doc.doc_type,
        fileUrl: doc.file_url,
        uploadedAt: doc.uploaded_at,
      }))
    : []

  res.json({
    item: {
      ...mapCreatorContentItem(row, stats),
      studioName: row.studio_name,
      creatorName: row.creator_name,
      creatorEmail: row.creator_email,
      applicationDeclaration,
      applicationDocuments,
    },
  })
})

router.patch('/content/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = getStandardCreatorContent(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Yapımcı filmi bulunamadı.' })
    return
  }

  const body = req.body as Record<string, unknown>
  const reviewStatus =
    body.reviewStatus !== undefined || body.review_status !== undefined
      ? String(body.reviewStatus ?? body.review_status).trim()
      : existing.review_status ?? 'pending'

  if (body.reviewStatus !== undefined || body.review_status !== undefined) {
    if (!['published', 'rejected', 'pending', 'under_review', 'on_hold', 'approved'].includes(reviewStatus)) {
      res.status(400).json({ error: 'Geçersiz inceleme durumu.' })
      return
    }
  }

  try {
    // Alan güncellemesi + yayın doğrulaması tek işlemde: Bunny/ödeme/okul kontrolü başarısızsa hiçbir şey yazılmaz.
    dbTransaction(() => {
      updateCreatorContentFields(existing, body)
      resolveCreatorPublishUpdate(dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!, body, reviewStatus)
    })
    if (body.reviewStatus !== undefined || body.review_status !== undefined) {
      notifyCreatorFilmReview({
        content: existing,
        reviewStatus,
        previousStatus: existing.review_status ?? null,
        adminUserId: req.auth!.userId,
        reviewNote:
          body.reviewNote !== undefined || body.review_note !== undefined
            ? String(body.reviewNote ?? body.review_note ?? '').trim() || null
            : undefined,
      })
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Film güncellenemedi.' })
    return
  }

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  const stats = getContentEngagementStats([row.id]).get(row.id)

  res.json({ item: mapCreatorContentItem(row, stats) })
})

router.patch('/content/:id/review', requireAdmin, (req: AuthRequest, res) => {
  const reviewStatus = String(req.body.reviewStatus ?? req.body.status ?? '').trim()
  if (!['published', 'rejected', 'pending', 'under_review', 'on_hold', 'approved'].includes(reviewStatus)) {
    res.status(400).json({ error: 'Geçersiz inceleme durumu.' })
    return
  }

  const existing = getStandardCreatorContent(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Yapımcı filmi bulunamadı.' })
    return
  }

  try {
    if (req.body.publishedAt !== undefined || req.body.publishNow === true) {
      resolveCreatorPublishUpdate(existing, req.body as Record<string, unknown>, reviewStatus)
    } else {
      applyCreatorReviewStatus(existing, reviewStatus)
    }
    notifyCreatorFilmReview({
      content: existing,
      reviewStatus,
      previousStatus: existing.review_status ?? null,
      adminUserId: req.auth!.userId,
      reviewNote:
        req.body.reviewNote !== undefined || req.body.review_note !== undefined
          ? String(req.body.reviewNote ?? req.body.review_note ?? '').trim() || null
          : undefined,
    })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'İnceleme güncellenemedi.' })
    return
  }

  if (reviewStatus === 'published' && isStudentMainRow(existing)) {
    addToGencSinemaCategory(existing.id)
  }

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  res.json({ item: mapContent(row), reviewStatus: row.review_status })
})

export default router
