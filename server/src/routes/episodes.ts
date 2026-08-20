import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { mapEpisode, serializeSubtitles } from '../mappers.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import type { EpisodeRow } from '../types.js'

const router = Router()

function episodeKey(episodeId?: string | null) {
  return episodeId ?? ''
}

router.get('/content/:contentId', (req, res) => {
  const rows = dbAll<EpisodeRow>(
    'SELECT * FROM episodes WHERE content_id = ? ORDER BY season, episode_number, sort_order',
    [req.params.contentId],
  )
  res.json({ episodes: rows.map(mapEpisode) })
})

router.post('/content/:contentId/bulk', requireAdmin, (req: AuthRequest, res) => {
  const contentId = req.params.contentId
  const parentContent = dbGet<{ video_url: string }>('SELECT video_url FROM content WHERE id = ?', [
    contentId,
  ])
  if (!parentContent) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }

  const season = Math.max(Number(req.body.season ?? 1), 1)
  const count = Math.min(Math.max(Number(req.body.count ?? 8), 1), 100)
  const titlePrefix = String(req.body.titlePrefix ?? 'Bölüm')
  const duration = String(req.body.duration ?? '')
  const customTitles = Array.isArray(req.body.titles)
    ? req.body.titles.map((title: unknown) => String(title).trim())
    : []
  const customUrls = Array.isArray(req.body.videoUrls)
    ? req.body.videoUrls.map((url: unknown) => String(url).trim())
    : []

  let startEpisode = Number(req.body.startEpisode)
  if (!Number.isFinite(startEpisode) || startEpisode < 1) {
    const maxRow = dbGet<{ max: number | null }>(
      'SELECT MAX(episode_number) as max FROM episodes WHERE content_id = ? AND season = ?',
      [contentId, season],
    )
    startEpisode = (maxRow?.max ?? 0) + 1
  }

  const fallbackVideoUrl = parentContent.video_url?.trim() ?? ''
  const created: ReturnType<typeof mapEpisode>[] = []
  let skippedCount = 0

  for (let i = 0; i < count; i++) {
    const episodeNum = startEpisode + i
    const exists = dbGet(
      'SELECT id FROM episodes WHERE content_id = ? AND season = ? AND episode_number = ?',
      [contentId, season, episodeNum],
    )
    if (exists) {
      skippedCount += 1
      continue
    }

    const title = customTitles[i]?.trim() || `${titlePrefix} ${episodeNum}`
    const videoUrl = customUrls[i]?.trim() || fallbackVideoUrl
    const id = uuid()
    dbRun(
      `INSERT INTO episodes (id, content_id, season, episode_number, title, description, duration, video_url, stream_provider, sort_order)
       VALUES (?, ?, ?, ?, ?, '', ?, ?, 'custom', ?)`,
      [id, contentId, season, episodeNum, title, duration, videoUrl, episodeNum - 1],
    )
    const row = dbGet<EpisodeRow>('SELECT * FROM episodes WHERE id = ?', [id])!
    created.push(mapEpisode(row))
  }

  if (created.length === 0 && skippedCount === count) {
    res.status(409).json({
      error: `Sezon ${season} için B${startEpisode}–B${startEpisode + count - 1} zaten mevcut.`,
      createdCount: 0,
      skippedCount,
      startEpisode,
    })
    return
  }

  res.status(201).json({
    episodes: created,
    createdCount: created.length,
    skippedCount,
    startEpisode,
    endEpisode: created.length > 0 ? created[created.length - 1].episode : null,
  })
})

router.post('/content/:contentId', requireAdmin, (req: AuthRequest, res) => {
  const body = req.body as Record<string, unknown>
  const subtitlesJson = serializeSubtitles(body.subtitles)
  const id = uuid()
  dbRun(
    `INSERT INTO episodes (id, content_id, season, episode_number, title, description, duration, video_url, stream_provider, sort_order, subtitles_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      req.params.contentId,
      Number(body.season ?? 1),
      Number(body.episode ?? body.episodeNumber ?? 1),
      String(body.title ?? 'Bölüm'),
      String(body.description ?? ''),
      String(body.duration ?? ''),
      String(body.videoUrl ?? body.video_url ?? ''),
      String(body.streamProvider ?? body.stream_provider ?? 'custom'),
      Number(body.sortOrder ?? 0),
      subtitlesJson,
    ],
  )
  const row = dbGet<EpisodeRow>('SELECT * FROM episodes WHERE id = ?', [id])!
  res.status(201).json({ episode: mapEpisode(row) })
})

router.patch('/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet<EpisodeRow>('SELECT * FROM episodes WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Bölüm bulunamadı.' })
    return
  }
  const body = req.body as Record<string, unknown>
  const subtitlesJson =
    body.subtitles !== undefined ? serializeSubtitles(body.subtitles) : existing.subtitles_json ?? '[]'
  dbRun(
    `UPDATE episodes SET season=?, episode_number=?, title=?, description=?, duration=?, video_url=?, stream_provider=?, sort_order=?, subtitles_json=? WHERE id=?`,
    [
      body.season !== undefined ? Number(body.season) : existing.season,
      body.episode !== undefined || body.episodeNumber !== undefined
        ? Number(body.episode ?? body.episodeNumber)
        : existing.episode_number,
      body.title !== undefined ? String(body.title) : existing.title,
      body.description !== undefined ? String(body.description) : existing.description,
      body.duration !== undefined ? String(body.duration) : existing.duration,
      body.videoUrl !== undefined ? String(body.videoUrl) : body.video_url !== undefined ? String(body.video_url) : existing.video_url,
      body.streamProvider !== undefined ? String(body.streamProvider) : existing.stream_provider ?? 'custom',
      body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sort_order,
      subtitlesJson,
      existing.id,
    ],
  )
  const row = dbGet<EpisodeRow>('SELECT * FROM episodes WHERE id = ?', [existing.id])!
  res.json({ episode: mapEpisode(row) })
})

router.delete('/:id', requireAdmin, (req: AuthRequest, res) => {
  dbRun('DELETE FROM episodes WHERE id = ?', [req.params.id])
  res.status(204).send()
})

export default router
