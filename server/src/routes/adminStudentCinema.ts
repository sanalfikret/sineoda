import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapContent, mapContentLicense } from '../mappers.js'
import { normalizeContentType } from '../constants/contentTypes.js'
import { parseCredits, serializeCredits } from '../services/credits.js'
import { parseContentAddedAt, parseLicenseDate } from '../services/license.js'
import { parsePublishedAt } from '../services/publish.js'
import {
  addToGencSinemaCategory,
  getContentEngagementStats,
  isStudentMainRow,
  removeFromGencSinemaCategory,
  type ContentEngagementStats,
} from '../services/studentCinema.js'
import type { ContentRow, CreatorDocumentRow, FilmSchoolRow } from '../types.js'

const router = Router()

function slugify(value: string) {
  return value
    .toLocaleLowerCase('tr')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapSchool(row: FilmSchoolRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    website: row.website,
    status: row.status,
    createdAt: row.created_at,
  }
}

function mapQueueItem(
  row: ContentRow & {
    studio_name: string | null
    school_name: string | null
    creator_name?: string | null
    creator_email?: string | null
    creator_phone?: string | null
  },
  stats?: ContentEngagementStats,
) {
  const credits = parseCredits(row.credits_json)
  return {
    ...mapContent(row),
    ...mapContentLicense(row),
    reviewStatus: row.review_status ?? 'pending',
    program: row.program ?? 'standard',
    contentFormat: row.content_format ?? 'main',
    parentContentId: row.parent_content_id ?? null,
    schoolId: row.school_id ?? null,
    schoolName: row.school_name,
    schoolReviewStatus: row.school_review_status ?? 'none',
    studioName: row.studio_name,
    creatorId: row.creator_id ?? null,
    creatorName: row.creator_name ?? null,
    creatorEmail: row.creator_email ?? null,
    creatorPhone: row.creator_phone ?? null,
    displayName: row.creator_name ?? credits.directors?.[0] ?? credits.cast?.[0] ?? null,
    qualifiedMinutes: stats?.qualifiedMinutes ?? 0,
    watchMinutes: stats?.watchMinutes ?? 0,
    watchCount: stats?.watchCount ?? 0,
    likes: stats?.likes ?? 0,
    viewers: stats?.viewers ?? 0,
    publishedAt: row.published_at ?? null,
  }
}

type StudentContentRow = ContentRow & {
  studio_name: string | null
  school_name: string | null
  creator_name?: string | null
  creator_email?: string | null
  creator_phone?: string | null
  project_crew?: string | null
  parent_title?: string | null
}

function fetchStudentContentRow(contentId: string) {
  return dbGet<StudentContentRow>(
    `SELECT c.*,
      cr.studio_name,
      cr.project_crew,
      u.name AS creator_name,
      u.email AS creator_email,
      u.phone AS creator_phone,
      fs.name AS school_name,
      parent.title AS parent_title
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     LEFT JOIN users u ON u.id = cr.user_id
     LEFT JOIN film_schools fs ON fs.id = c.school_id
     LEFT JOIN content parent ON parent.id = c.parent_content_id
     WHERE c.id = ? AND c.program = 'student_cinema'`,
    [contentId],
  )
}

function applyReviewStatus(
  existing: ContentRow,
  reviewStatus: string,
  options?: { publishedAt?: string | null },
) {
  if (reviewStatus === 'published' && existing.school_review_status !== 'approved') {
    throw new Error('Yayınlamadan önce okul onayı verilmelidir.')
  }

  let publishedAt: string | null
  if (options?.publishedAt !== undefined) {
    publishedAt = options.publishedAt
  } else if (reviewStatus === 'published') {
    publishedAt = existing.published_at ?? new Date().toISOString()
  } else if (reviewStatus === 'rejected' || reviewStatus === 'pending') {
    publishedAt = null
  } else {
    publishedAt = existing.published_at ?? null
  }

  dbRun('UPDATE content SET review_status = ?, published_at = ? WHERE id = ?', [
    reviewStatus,
    publishedAt,
    existing.id,
  ])

  const isLive =
    reviewStatus === 'published' &&
    publishedAt !== null &&
    new Date(publishedAt) <= new Date()

  if (isLive && isStudentMainRow(existing)) {
    addToGencSinemaCategory(existing.id)
  } else {
    removeFromGencSinemaCategory(existing.id)
  }
}

function deleteStudentContent(existing: ContentRow) {
  removeFromGencSinemaCategory(existing.id)
  dbRun('DELETE FROM category_items WHERE content_id = ?', [existing.id])
  dbRun('DELETE FROM watch_progress WHERE content_id = ?', [existing.id])
  dbRun('DELETE FROM watchlist WHERE content_id = ?', [existing.id])
  dbRun('DELETE FROM content_reactions WHERE content_id = ?', [existing.id])
  dbRun('DELETE FROM episodes WHERE content_id = ?', [existing.id])
  dbRun('UPDATE content SET parent_content_id = NULL WHERE parent_content_id = ?', [existing.id])
  dbRun('DELETE FROM content WHERE id = ?', [existing.id])
}

router.get('/schools', requireAdmin, (_req: AuthRequest, res) => {
  const rows = dbAll<FilmSchoolRow>('SELECT * FROM film_schools ORDER BY name')
  res.json({ schools: rows.map(mapSchool) })
})

router.post('/schools', requireAdmin, (req: AuthRequest, res) => {
  const name = String(req.body.name ?? '').trim()
  if (!name) {
    res.status(400).json({ error: 'Okul adı zorunlu.' })
    return
  }

  let slug = String(req.body.slug ?? slugify(name)).trim() || slugify(name)
  let counter = 1
  while (dbGet('SELECT id FROM film_schools WHERE slug = ?', [slug])) {
    slug = `${slugify(name)}-${counter++}`
  }

  const id = uuid()
  const now = new Date().toISOString()
  dbRun(
    'INSERT INTO film_schools (id, name, slug, logo_url, website, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      name,
      slug,
      String(req.body.logoUrl ?? req.body.logo_url ?? '').trim(),
      String(req.body.website ?? '').trim(),
      req.body.status === 'inactive' ? 'inactive' : 'active',
      now,
    ],
  )

  const row = dbGet<FilmSchoolRow>('SELECT * FROM film_schools WHERE id = ?', [id])!
  res.status(201).json({ school: mapSchool(row) })
})

router.patch('/schools/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet<FilmSchoolRow>('SELECT * FROM film_schools WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Okul bulunamadı.' })
    return
  }

  const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name
  if (!name) {
    res.status(400).json({ error: 'Okul adı boş olamaz.' })
    return
  }

  dbRun(
    'UPDATE film_schools SET name = ?, logo_url = ?, website = ?, status = ? WHERE id = ?',
    [
      name,
      req.body.logoUrl !== undefined ? String(req.body.logoUrl).trim() : existing.logo_url,
      req.body.website !== undefined ? String(req.body.website).trim() : existing.website,
      req.body.status === 'inactive' ? 'inactive' : req.body.status === 'active' ? 'active' : existing.status,
      existing.id,
    ],
  )

  const row = dbGet<FilmSchoolRow>('SELECT * FROM film_schools WHERE id = ?', [existing.id])!
  res.json({ school: mapSchool(row) })
})

router.get('/queue', requireAdmin, (_req: AuthRequest, res) => {
  const rows = dbAll<
    ContentRow & {
      studio_name: string | null
      school_name: string | null
      creator_name: string | null
      creator_email: string | null
      creator_phone: string | null
    }
  >(
    `SELECT c.*, cr.studio_name, fs.name AS school_name, u.name AS creator_name, u.email AS creator_email, u.phone AS creator_phone
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     LEFT JOIN users u ON u.id = cr.user_id
     LEFT JOIN film_schools fs ON fs.id = c.school_id
     WHERE c.program = 'student_cinema'
       AND (
         c.review_status = 'pending'
         OR c.school_review_status = 'pending'
       )
     ORDER BY c.content_added_at DESC`,
  )

  res.json({ items: rows.map((row) => mapQueueItem(row)) })
})

router.get('/content', requireAdmin, (_req: AuthRequest, res) => {
  const rows = dbAll<
    ContentRow & {
      studio_name: string | null
      school_name: string | null
      creator_name: string | null
      creator_email: string | null
      creator_phone: string | null
    }
  >(
    `SELECT c.*, cr.studio_name, fs.name AS school_name, u.name AS creator_name, u.email AS creator_email, u.phone AS creator_phone
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     LEFT JOIN users u ON u.id = cr.user_id
     LEFT JOIN film_schools fs ON fs.id = c.school_id
     WHERE c.program = 'student_cinema'
     ORDER BY c.content_added_at DESC`,
  )

  const stats = getContentEngagementStats(rows.map((row) => row.id))
  res.json({
    items: rows.map((row) => mapQueueItem(row, stats.get(row.id))),
  })
})

router.post('/content/bulk-review', requireAdmin, (req: AuthRequest, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : []
  const reviewStatus = String(req.body.reviewStatus ?? '').trim()
  const schoolReviewStatus =
    req.body.schoolReviewStatus !== undefined ? String(req.body.schoolReviewStatus).trim() : undefined

  if (ids.length === 0) {
    res.status(400).json({ error: 'En az bir içerik seçilmelidir.' })
    return
  }

  if (!['published', 'rejected', 'pending'].includes(reviewStatus)) {
    res.status(400).json({ error: 'Geçersiz inceleme durumu.' })
    return
  }

  let updated = 0
  const errors: string[] = []

  for (const id of ids) {
    const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND program = ?', [
      id,
      'student_cinema',
    ])
    if (!existing) {
      errors.push(`${id}: bulunamadı`)
      continue
    }

    if (schoolReviewStatus && ['pending', 'approved', 'rejected', 'none'].includes(schoolReviewStatus)) {
      dbRun('UPDATE content SET school_review_status = ? WHERE id = ?', [schoolReviewStatus, existing.id])
    }

    const refreshed = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
    try {
      applyReviewStatus(refreshed, reviewStatus)
      updated += 1
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : 'güncellenemedi'}`)
    }
  }

  res.json({ updated, errors })
})

router.post('/content/bulk-delete', requireAdmin, (req: AuthRequest, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : []
  if (ids.length === 0) {
    res.status(400).json({ error: 'En az bir içerik seçilmelidir.' })
    return
  }

  let deleted = 0
  const errors: string[] = []
  for (const id of ids) {
    const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND program = ?', [
      id,
      'student_cinema',
    ])
    if (!existing) {
      errors.push(`${id}: bulunamadı`)
      continue
    }
    try {
      deleteStudentContent(existing)
      deleted += 1
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : 'silinemedi'}`)
    }
  }

  res.json({ deleted, errors })
})

router.get('/content/:id', requireAdmin, (req: AuthRequest, res) => {
  const row = fetchStudentContentRow(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Genç Sinema içeriği bulunamadı.' })
    return
  }

  const stats = getContentEngagementStats([row.id]).get(row.id)
  const documents = row.creator_id
    ? dbAll<CreatorDocumentRow>(
        'SELECT id, creator_id, doc_type, file_url, uploaded_at FROM creator_documents WHERE creator_id = ? ORDER BY uploaded_at DESC',
        [row.creator_id],
      )
    : []

  res.json({
    item: {
      ...mapQueueItem(row, stats),
      creatorEmail: row.creator_email,
      creatorPhone: row.creator_phone,
      projectCrew: row.project_crew,
      parentTitle: row.parent_title,
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      docType: doc.doc_type,
      fileUrl: doc.file_url,
      uploadedAt: doc.uploaded_at,
    })),
  })
})

router.patch('/content/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND program = ?', [
    req.params.id,
    'student_cinema',
  ])
  if (!existing) {
    res.status(404).json({ error: 'Genç Sinema içeriği bulunamadı.' })
    return
  }

  const body = req.body as Record<string, unknown>
  const reviewStatus =
    body.reviewStatus !== undefined ? String(body.reviewStatus).trim() : existing.review_status ?? 'pending'
  const schoolReviewStatus =
    body.schoolReviewStatus !== undefined
      ? String(body.schoolReviewStatus).trim()
      : existing.school_review_status ?? 'none'

  if (body.reviewStatus !== undefined) {
    try {
      const publishedAtOverride =
        body.publishedAt !== undefined || body.publishNow === true
          ? parsePublishedAt(body.publishNow ? null : body.publishedAt ?? body.published_at, {
              publishNow: body.publishNow === true,
              existing: existing.published_at ?? null,
            })
          : undefined
      applyReviewStatus(
        { ...existing, school_review_status: schoolReviewStatus },
        reviewStatus,
        publishedAtOverride !== undefined ? { publishedAt: publishedAtOverride } : undefined,
      )
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'İnceleme güncellenemedi.' })
      return
    }
  } else if (body.publishedAt !== undefined || body.publishNow === true) {
    try {
      const publishedAt = parsePublishedAt(body.publishNow ? null : body.publishedAt ?? body.published_at, {
        publishNow: body.publishNow === true,
        existing: existing.published_at ?? null,
      })
      applyReviewStatus(existing, existing.review_status ?? 'pending', { publishedAt })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Yayın tarihi güncellenemedi.' })
      return
    }
  }

  if (body.schoolReviewStatus !== undefined) {
    if (!['pending', 'approved', 'rejected', 'none'].includes(schoolReviewStatus)) {
      res.status(400).json({ error: 'Geçersiz okul onay durumu.' })
      return
    }
    dbRun('UPDATE content SET school_review_status = ? WHERE id = ?', [schoolReviewStatus, existing.id])
  }

  const schoolId =
    body.schoolId !== undefined
      ? String(body.schoolId || '').trim() || null
      : existing.school_id ?? null

  if (body.schoolId !== undefined && schoolId) {
    const school = dbGet('SELECT id FROM film_schools WHERE id = ?', [schoolId])
    if (!school) {
      res.status(400).json({ error: 'Okul bulunamadı.' })
      return
    }
  }

  const licenseExpiresAt =
    body.licenseUnlimited === true || body.license_unlimited === true
      ? null
      : body.licenseExpiresAt !== undefined || body.license_expires_at !== undefined
        ? parseLicenseDate(body.licenseExpiresAt ?? body.license_expires_at)
        : existing.license_expires_at ?? null

  const contentAddedAt =
    body.contentAddedAt !== undefined || body.content_added_at !== undefined
      ? parseContentAddedAt(body.contentAddedAt ?? body.content_added_at)
      : existing.content_added_at ?? parseContentAddedAt(null)

  dbRun(
    `UPDATE content SET
      title = ?,
      description = ?,
      year = ?,
      duration = ?,
      rating = ?,
      type = ?,
      genres = ?,
      poster = ?,
      backdrop = ?,
      video_url = ?,
      trailer_url = ?,
      stream_provider = ?,
      credits_json = ?,
      school_id = ?,
      featured = ?,
      license_expires_at = ?,
      content_added_at = ?
    WHERE id = ?`,
    [
      body.title !== undefined ? String(body.title).trim() : existing.title,
      body.description !== undefined ? String(body.description).trim() : existing.description,
      body.year !== undefined ? Number(body.year) : existing.year,
      body.duration !== undefined ? String(body.duration).trim() : existing.duration,
      body.rating !== undefined ? String(body.rating).trim() : existing.rating,
      body.type !== undefined ? normalizeContentType(body.type, existing.type) : existing.type,
      body.genres !== undefined ? JSON.stringify(body.genres) : existing.genres,
      body.poster !== undefined ? String(body.poster).trim() : existing.poster,
      body.backdrop !== undefined ? String(body.backdrop).trim() : existing.backdrop,
      body.videoUrl !== undefined
        ? String(body.videoUrl).trim()
        : body.video_url !== undefined
          ? String(body.video_url).trim()
          : existing.video_url,
      body.trailerUrl !== undefined
        ? String(body.trailerUrl).trim()
        : body.trailer_url !== undefined
          ? String(body.trailer_url).trim()
          : existing.trailer_url ?? '',
      body.streamProvider !== undefined
        ? String(body.streamProvider).trim()
        : existing.stream_provider ?? 'custom',
      body.credits !== undefined
        ? serializeCredits(body.credits)
        : existing.credits_json ?? '{}',
      schoolId,
      body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured ?? 0,
      licenseExpiresAt,
      contentAddedAt,
      existing.id,
    ],
  )

  const row = fetchStudentContentRow(existing.id)!
  const stats = getContentEngagementStats([row.id]).get(row.id)
  res.json({ item: mapQueueItem(row, stats) })
})

router.patch('/content/:id/school-review', requireAdmin, (req: AuthRequest, res) => {
  const status = String(req.body.schoolReviewStatus ?? req.body.status ?? '').trim()
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Geçersiz okul onay durumu.' })
    return
  }

  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND program = ?', [
    req.params.id,
    'student_cinema',
  ])
  if (!existing) {
    res.status(404).json({ error: 'Genç Sinema içeriği bulunamadı.' })
    return
  }

  dbRun('UPDATE content SET school_review_status = ? WHERE id = ?', [status, existing.id])

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  res.json({
    item: {
      ...mapContent(row),
      schoolReviewStatus: row.school_review_status ?? 'none',
      reviewStatus: row.review_status ?? 'pending',
    },
  })
})

router.patch('/content/:id/review', requireAdmin, (req: AuthRequest, res) => {
  const reviewStatus = String(req.body.reviewStatus ?? req.body.status ?? '').trim()
  if (!['published', 'rejected', 'pending'].includes(reviewStatus)) {
    res.status(400).json({ error: 'Geçersiz inceleme durumu.' })
    return
  }

  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND program = ?', [
    req.params.id,
    'student_cinema',
  ])
  if (!existing) {
    res.status(404).json({ error: 'Genç Sinema içeriği bulunamadı.' })
    return
  }

  try {
    const publishedAtOverride =
      req.body.publishedAt !== undefined || req.body.publishNow === true
        ? parsePublishedAt(req.body.publishNow ? null : req.body.publishedAt ?? req.body.published_at, {
            publishNow: req.body.publishNow === true,
            existing: existing.published_at ?? null,
          })
        : undefined
    applyReviewStatus(
      existing,
      reviewStatus,
      publishedAtOverride !== undefined ? { publishedAt: publishedAtOverride } : undefined,
    )
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'İnceleme güncellenemedi.' })
    return
  }

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  res.json({ item: mapContent(row), reviewStatus, schoolReviewStatus: row.school_review_status ?? 'none' })
})

router.delete('/content/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND program = ?', [
    req.params.id,
    'student_cinema',
  ])
  if (!existing) {
    res.status(404).json({ error: 'Genç Sinema içeriği bulunamadı.' })
    return
  }

  deleteStudentContent(existing)
  res.status(204).send()
})

router.delete('/schools/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet<FilmSchoolRow>('SELECT * FROM film_schools WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Okul bulunamadı.' })
    return
  }

  const linkedCreator = dbGet('SELECT id FROM creators WHERE school_id = ? LIMIT 1', [existing.id])
  const linkedContent = dbGet('SELECT id FROM content WHERE school_id = ? LIMIT 1', [existing.id])
  if (linkedCreator || linkedContent) {
    res.status(400).json({
      error: 'Bu okula bağlı başvuru veya içerik var. Silmek yerine pasif yapın.',
    })
    return
  }

  dbRun('DELETE FROM film_schools WHERE id = ?', [existing.id])
  res.status(204).send()
})

export default router
