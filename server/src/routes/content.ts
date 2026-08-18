import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapContent, serializeSubtitles, slugify } from '../mappers.js'
import { serializeCredits } from '../services/credits.js'
import { parseContentAddedAt, parseLicenseDate } from '../services/license.js'
import { normalizeContentType } from '../constants/contentTypes.js'
import type { ContentRow } from '../types.js'

const router = Router()

function contentFields(body: Record<string, unknown>, existing?: ContentRow) {
  const featured = body.featured !== undefined ? Boolean(body.featured) : Boolean(existing?.featured)
  return {
    title: body.title !== undefined ? String(body.title) : existing!.title,
    description: body.description !== undefined ? String(body.description) : existing!.description,
    year: body.year !== undefined ? Number(body.year) : existing!.year,
    duration: body.duration !== undefined ? String(body.duration) : existing!.duration,
    rating: body.rating !== undefined ? String(body.rating) : existing!.rating,
    type:
      body.type !== undefined
        ? normalizeContentType(body.type, existing?.type ?? 'film')
        : existing!.type,
    genres: body.genres !== undefined ? JSON.stringify(body.genres) : existing!.genres,
    poster: body.poster !== undefined ? String(body.poster) : existing!.poster,
    backdrop: body.backdrop !== undefined ? String(body.backdrop) : existing!.backdrop,
    videoUrl: body.videoUrl !== undefined ? String(body.videoUrl) : body.video_url !== undefined ? String(body.video_url) : existing!.video_url,
    streamProvider: body.streamProvider !== undefined ? String(body.streamProvider) : body.stream_provider !== undefined ? String(body.stream_provider) : (existing?.stream_provider ?? 'custom'),
    trailerUrl: body.trailerUrl !== undefined ? String(body.trailerUrl) : body.trailer_url !== undefined ? String(body.trailer_url) : (existing?.trailer_url ?? ''),
    videoFormat: body.videoFormat !== undefined ? String(body.videoFormat) : body.video_format !== undefined ? String(body.video_format) : (existing?.video_format ?? 'standard'),
    isNew: body.isNew !== undefined ? (body.isNew ? 1 : 0) : (existing?.is_new ?? 0),
    newUntil:
      body.isNew !== undefined
        ? body.isNew
          ? body.newUntil
            ? String(body.newUntil)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null
        : body.newUntil !== undefined
          ? body.newUntil
            ? String(body.newUntil)
            : null
          : (existing?.new_until ?? null),
    featured,
    subtitlesJson:
      body.subtitles !== undefined
        ? serializeSubtitles(body.subtitles)
        : body.subtitlesJson !== undefined
          ? serializeSubtitles(body.subtitlesJson)
          : existing?.subtitles_json ?? '[]',
    creditsJson:
      body.credits !== undefined
        ? serializeCredits(body.credits)
        : body.creditsJson !== undefined
          ? serializeCredits(body.creditsJson)
          : existing?.credits_json ?? '{}',
    contentAddedAt:
      body.contentAddedAt !== undefined || body.content_added_at !== undefined
        ? parseContentAddedAt(body.contentAddedAt ?? body.content_added_at)
        : existing?.content_added_at ?? parseContentAddedAt(null),
    licenseExpiresAt:
      body.licenseUnlimited === true || body.license_unlimited === true
        ? null
        : body.licenseExpiresAt !== undefined || body.license_expires_at !== undefined
          ? parseLicenseDate(body.licenseExpiresAt ?? body.license_expires_at)
          : existing?.license_expires_at ?? null,
  }
}

router.get('/', (_req, res) => {
  res.json({ catalog: dbAll<ContentRow>('SELECT * FROM content ORDER BY title').map(mapContent) })
})

router.get('/:id', (req, res) => {
  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [req.params.id])
  if (!row) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }
  res.json({ item: mapContent(row) })
})

router.post('/', requireAdmin, (req: AuthRequest, res) => {
  const body = req.body as Record<string, unknown>
  const title = String(body.title ?? '').trim()
  if (!title) {
    res.status(400).json({ error: 'Başlık zorunlu.' })
    return
  }

  let id = body.id ? String(body.id) : slugify(title)
  let counter = 1
  while (dbGet('SELECT id FROM content WHERE id = ?', [id])) {
    id = `${slugify(title)}-${counter++}`
  }

  const fields = contentFields(body, {
    title,
    description: '',
    year: new Date().getFullYear(),
    duration: '',
    rating: '13+',
    type: 'film',
    genres: '[]',
    poster: '',
    backdrop: '',
    video_url: '',
    featured: 0,
  } as ContentRow)

  if (fields.featured) dbRun('UPDATE content SET featured = 0')

  dbRun(
    `INSERT INTO content (id, title, description, year, duration, rating, type, genres, poster, backdrop, video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured, subtitles_json, credits_json, content_added_at, license_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, fields.title, fields.description, fields.year, fields.duration, fields.rating, fields.type,
      fields.genres, fields.poster, fields.backdrop || fields.poster, fields.videoUrl, fields.streamProvider,
      fields.trailerUrl, fields.videoFormat, fields.isNew, fields.newUntil, fields.featured ? 1 : 0,
      fields.subtitlesJson, fields.creditsJson, fields.contentAddedAt, fields.licenseExpiresAt,
    ],
  )

  res.status(201).json({ item: mapContent(dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [id])!) })
})

router.patch('/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }

  const fields = contentFields(req.body as Record<string, unknown>, existing)
  if (fields.featured) dbRun('UPDATE content SET featured = 0')

  dbRun(
    `UPDATE content SET title=?, description=?, year=?, duration=?, rating=?, type=?, genres=?, poster=?, backdrop=?, video_url=?, stream_provider=?, trailer_url=?, video_format=?, is_new=?, new_until=?, featured=?, subtitles_json=?, credits_json=?, content_added_at=?, license_expires_at=? WHERE id=?`,
    [
      fields.title, fields.description, fields.year, fields.duration, fields.rating, fields.type,
      fields.genres, fields.poster, fields.backdrop, fields.videoUrl, fields.streamProvider,
      fields.trailerUrl, fields.videoFormat, fields.isNew, fields.newUntil, fields.featured ? 1 : 0,
      fields.subtitlesJson, fields.creditsJson, fields.contentAddedAt, fields.licenseExpiresAt,
      existing.id,
    ],
  )

  res.json({ item: mapContent(dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!) })
})

router.delete('/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet('SELECT id FROM content WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }
  dbRun('DELETE FROM content WHERE id = ?', [req.params.id])
  res.status(204).send()
})

router.post('/:id/featured', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet('SELECT id FROM content WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }
  dbRun('UPDATE content SET featured = 0')
  dbRun('UPDATE content SET featured = 1 WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

export default router
