import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapContent } from '../mappers.js'
import type { ContentRow, FilmSchoolRow } from '../types.js'

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

function mapQueueItem(row: ContentRow & { studio_name: string | null; school_name: string | null }) {
  return {
    ...mapContent(row),
    reviewStatus: row.review_status ?? 'pending',
    program: row.program ?? 'standard',
    contentFormat: row.content_format ?? 'main',
    parentContentId: row.parent_content_id ?? null,
    schoolId: row.school_id ?? null,
    schoolName: row.school_name,
    schoolReviewStatus: row.school_review_status ?? 'none',
    studioName: row.studio_name,
    creatorId: row.creator_id ?? null,
  }
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
  const rows = dbAll<ContentRow & { studio_name: string | null; school_name: string | null }>(
    `SELECT c.*, cr.studio_name, fs.name AS school_name
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     LEFT JOIN film_schools fs ON fs.id = c.school_id
     WHERE c.program = 'student_cinema'
       AND (
         c.review_status = 'pending'
         OR c.school_review_status = 'pending'
       )
     ORDER BY c.content_added_at DESC`,
  )

  res.json({ items: rows.map(mapQueueItem) })
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

  if (reviewStatus === 'published' && existing.school_review_status !== 'approved') {
    res.status(400).json({ error: 'Yayınlamadan önce okul onayı verilmelidir.' })
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
  res.json({
    item: {
      ...mapContent(row),
      reviewStatus: row.review_status ?? 'pending',
      schoolReviewStatus: row.school_review_status ?? 'none',
    },
  })
})

export default router
