import { Router } from 'express'
import { dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapContent, mapContentAdmin, serializeSubtitles } from '../mappers.js'
import { serializeCredits } from '../services/credits.js'
import { resolveDurationFields } from '../services/duration.js'
import { parseContentAddedAt, parseLicenseDate } from '../services/license.js'
import { parsePublishedAt } from '../services/publish.js'
import {
  addToCekimCategory,
  createCekimNotlariCategory,
  deleteCekimNotlariCategory,
  isCekimCategoryId,
  listAdminCekimNotlariItems,
  listAdminCekimNotlariSections,
  listCekimNotlariCategoryRows,
  reorderCekimNotlariCategories,
  SHOOTING_NOTES_PROGRAM,
  updateCekimNotlariCategoryTitle,
} from '../services/cekimNotlari.js'
import { newShootingNotesContentId } from '../services/cekimNotlariSeed.js'
import { resolveStreamProvider } from '../services/streamProvider.js'
import type { ContentRow } from '../types.js'

const router = Router()
router.use(requireAdmin)

router.get('/', (_req, res) => {
  res.json({
    categories: listCekimNotlariCategoryRows().map(({ id, title }) => ({ id, title })),
    sections: listAdminCekimNotlariSections(),
    items: listAdminCekimNotlariItems(),
  })
})

router.post('/categories', (req: AuthRequest, res) => {
  try {
    const category = createCekimNotlariCategory(String(req.body.title ?? ''))
    res.status(201).json({
      category,
      sections: listAdminCekimNotlariSections(),
    })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Kategori eklenemedi.' })
  }
})

router.patch('/categories/reorder', (req: AuthRequest, res) => {
  const orderedIds = req.body.orderedIds
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400).json({ error: 'orderedIds dizisi zorunlu.' })
    return
  }
  try {
    const categories = reorderCekimNotlariCategories(orderedIds.map(String))
    res.json({ categories, sections: listAdminCekimNotlariSections() })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Sıralama kaydedilemedi.' })
  }
})

router.patch('/categories/:categoryId', (req: AuthRequest, res) => {
  try {
    const category = updateCekimNotlariCategoryTitle(
      req.params.categoryId,
      String(req.body.title ?? ''),
    )
    res.json({ category, sections: listAdminCekimNotlariSections() })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Kategori güncellenemedi.' })
  }
})

router.delete('/categories/:categoryId', (req: AuthRequest, res) => {
  try {
    deleteCekimNotlariCategory(req.params.categoryId)
    res.json({ sections: listAdminCekimNotlariSections() })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Kategori silinemedi.' })
  }
})

router.get('/:id', (req, res) => {
  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND program = ?', [
    req.params.id,
    SHOOTING_NOTES_PROGRAM,
  ])
  if (!row) {
    res.status(404).json({ error: 'Video bulunamadı.' })
    return
  }

  const categoryRow = dbGet<{ category_id: string }>(
    `SELECT category_id FROM category_items WHERE content_id = ? AND category_id LIKE 'cekim-%' LIMIT 1`,
    [req.params.id],
  )
  const fallbackCategory = listCekimNotlariCategoryRows()[0]

  res.json({
    item: mapContentAdmin(row),
    categoryId: categoryRow?.category_id ?? fallbackCategory?.id ?? '',
  })
})

router.post('/', (req: AuthRequest, res) => {
  const body = req.body as Record<string, unknown>
  const title = String(body.title ?? '').trim()
  const categoryId = String(body.categoryId ?? '').trim()
  if (!title) {
    res.status(400).json({ error: 'Başlık zorunlu.' })
    return
  }
  if (!isCekimCategoryId(categoryId) || !dbGet('SELECT id FROM categories WHERE id = ?', [categoryId])) {
    res.status(400).json({ error: 'Geçerli bir alt kategori seçin.' })
    return
  }

  const id = body.id ? String(body.id) : newShootingNotesContentId(title)
  if (dbGet('SELECT id FROM content WHERE id = ?', [id])) {
    res.status(409).json({ error: 'Bu id zaten kullanılıyor.' })
    return
  }

  const durationFields = resolveDurationFields(body)
  const expert = String(body.expert ?? body.directors ?? '').trim()
  const now = new Date().toISOString()
  const videoUrl = String(body.videoUrl ?? body.video_url ?? '')
  const streamProvider = resolveStreamProvider(body, videoUrl)

  dbRun(
    `INSERT INTO content (
      id, title, description, year, duration, duration_minutes, rating, type, genres,
      poster, backdrop, video_url, stream_provider, trailer_url, video_format,
      is_new, featured, program, content_format, published_at,
      credits_json, festivals_json, subtitles_json, content_added_at, license_expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      String(body.description ?? ''),
      Number(body.year ?? new Date().getFullYear()),
      durationFields.duration,
      durationFields.durationMinutes,
      String(body.rating ?? '13+'),
      'belgesel',
      JSON.stringify(['Eğitim', 'Sinema']),
      String(body.poster ?? ''),
      String(body.backdrop ?? body.poster ?? ''),
      videoUrl,
      streamProvider,
      String(body.trailerUrl ?? body.trailer_url ?? ''),
      'standard',
      0,
      0,
      SHOOTING_NOTES_PROGRAM,
      'main',
      body.publishNow === false && !body.publishedAt ? null : parsePublishedAt(body.publishedAt, { publishNow: true }),
      serializeCredits({
        directors: expert ? [expert] : [],
        producers: [],
        cast: [],
        studio: String(body.studio ?? 'Sineoda Eğitim'),
      }),
      '[]',
      serializeSubtitles(body.subtitles ?? []),
      parseContentAddedAt(body.contentAddedAt ?? now),
      body.licenseUnlimited === false && body.licenseExpiresAt
        ? parseLicenseDate(body.licenseExpiresAt)
        : null,
    ],
  )

  addToCekimCategory(id, categoryId)

  res.status(201).json({
    item: mapContent(dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [id])!),
    categoryId,
    sections: listAdminCekimNotlariSections(),
  })
})

router.patch('/:id', (req: AuthRequest, res) => {
  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND program = ?', [
    req.params.id,
    SHOOTING_NOTES_PROGRAM,
  ])
  if (!existing) {
    res.status(404).json({ error: 'Video bulunamadı.' })
    return
  }

  const body = req.body as Record<string, unknown>
  const durationFields = resolveDurationFields(body, existing)
  const expert = body.expert !== undefined ? String(body.expert).trim() : undefined
  const nextVideoUrl =
    body.videoUrl !== undefined
      ? String(body.videoUrl)
      : body.video_url !== undefined
        ? String(body.video_url)
        : existing.video_url
  const nextStreamProvider =
    body.streamProvider !== undefined || body.videoUrl !== undefined || body.video_url !== undefined
      ? resolveStreamProvider(body, nextVideoUrl)
      : existing.stream_provider ?? 'bunny'
  const credits = expert !== undefined
    ? serializeCredits({
        directors: expert ? [expert] : [],
        producers: [],
        cast: [],
        studio: String(body.studio ?? 'Sineoda Eğitim'),
      })
    : existing.credits_json

  dbRun(
    `UPDATE content SET
      title = ?, description = ?, year = ?, duration = ?, duration_minutes = ?, rating = ?,
      poster = ?, backdrop = ?, video_url = ?, stream_provider = ?, trailer_url = ?,
      credits_json = ?, published_at = ?, license_expires_at = ?
     WHERE id = ?`,
    [
      body.title !== undefined ? String(body.title) : existing.title,
      body.description !== undefined ? String(body.description) : existing.description,
      body.year !== undefined ? Number(body.year) : existing.year,
      durationFields.duration,
      durationFields.durationMinutes,
      body.rating !== undefined ? String(body.rating) : existing.rating,
      body.poster !== undefined ? String(body.poster) : existing.poster,
      body.backdrop !== undefined ? String(body.backdrop) : existing.backdrop,
      nextVideoUrl,
      nextStreamProvider,
      body.trailerUrl !== undefined ? String(body.trailerUrl) : existing.trailer_url,
      credits,
      body.publishedAt !== undefined || body.publishNow !== undefined
        ? parsePublishedAt(body.publishedAt ?? body.published_at, {
            publishNow: body.publishNow === true || body.publish_now === true,
            existing: existing.published_at,
          })
        : existing.published_at,
      body.licenseUnlimited === true
        ? null
        : body.licenseExpiresAt !== undefined
          ? parseLicenseDate(body.licenseExpiresAt)
          : existing.license_expires_at,
      existing.id,
    ],
  )

  if (body.categoryId !== undefined) {
    addToCekimCategory(existing.id, String(body.categoryId))
  }

  const categoryRow = dbGet<{ category_id: string }>(
    `SELECT category_id FROM category_items WHERE content_id = ? AND category_id LIKE 'cekim-%' LIMIT 1`,
    [existing.id],
  )

  res.json({
    item: mapContent(dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!),
    categoryId: categoryRow?.category_id ?? null,
    sections: listAdminCekimNotlariSections(),
  })
})

router.delete('/:id', (req: AuthRequest, res) => {
  const existing = dbGet('SELECT id FROM content WHERE id = ? AND program = ?', [
    req.params.id,
    SHOOTING_NOTES_PROGRAM,
  ])
  if (!existing) {
    res.status(404).json({ error: 'Video bulunamadı.' })
    return
  }
  dbRun('DELETE FROM category_items WHERE content_id = ?', [req.params.id])
  dbRun('DELETE FROM content WHERE id = ?', [req.params.id])
  res.status(204).send()
})

export default router
