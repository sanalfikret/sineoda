import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { mapEpisode } from '../mappers.js'
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
  const season = Number(req.body.season ?? 1)
  const count = Math.min(Math.max(Number(req.body.count ?? 8), 1), 100)
  const titlePrefix = String(req.body.titlePrefix ?? 'Bölüm')
  const duration = String(req.body.duration ?? '')
  const startEpisode = Number(req.body.startEpisode ?? 1)

  const created: ReturnType<typeof mapEpisode>[] = []

  for (let i = 0; i < count; i++) {
    const episodeNum = startEpisode + i
    const exists = dbGet(
      'SELECT id FROM episodes WHERE content_id = ? AND season = ? AND episode_number = ?',
      [req.params.contentId, season, episodeNum],
    )
    if (exists) continue

    const id = uuid()
    dbRun(
      `INSERT INTO episodes (id, content_id, season, episode_number, title, description, duration, video_url, stream_provider, sort_order)
       VALUES (?, ?, ?, ?, ?, '', ?, '', 'custom', ?)`,
      [id, req.params.contentId, season, episodeNum, `${titlePrefix} ${episodeNum}`, duration, i],
    )
    const row = dbGet<EpisodeRow>('SELECT * FROM episodes WHERE id = ?', [id])!
    created.push(mapEpisode(row))
  }

  res.status(201).json({ episodes: created, createdCount: created.length })
})

router.post('/content/:contentId', requireAdmin, (req: AuthRequest, res) => {
  const body = req.body as Record<string, unknown>
  const id = uuid()
  dbRun(
    `INSERT INTO episodes (id, content_id, season, episode_number, title, description, duration, video_url, stream_provider, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  dbRun(
    `UPDATE episodes SET season=?, episode_number=?, title=?, description=?, duration=?, video_url=?, stream_provider=?, sort_order=? WHERE id=?`,
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
