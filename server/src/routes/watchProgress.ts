import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { getProfileId, requireAuth, type AuthRequest } from '../middleware/auth.js'
import { normalizeContentType } from '../constants/contentTypes.js'
import { isQualifiedWatch } from '../services/watchQualification.js'

const router = Router()

function episodeKey(episodeId?: string | null) {
  return episodeId ?? ''
}

router.get('/', requireAuth, (req: AuthRequest, res) => {
  const profileId = getProfileId(req)
  if (!profileId) {
    res.status(400).json({ error: 'Profil gerekli.' })
    return
  }

  const contentId = String(req.query.contentId ?? '')
  const episodeId = episodeKey(req.query.episodeId ? String(req.query.episodeId) : null)

  if (!contentId) {
    res.status(400).json({ error: 'contentId gerekli.' })
    return
  }

  const row = dbGet<{
    position_seconds: number
    duration_seconds: number
    total_watched_seconds: number
    qualified: number
    qualified_seconds: number
    updated_at: string
  }>(
    'SELECT position_seconds, duration_seconds, total_watched_seconds, qualified, qualified_seconds, updated_at FROM watch_progress WHERE profile_id = ? AND content_id = ? AND episode_id = ?',
    [profileId, contentId, episodeId],
  )

  res.json({
    progress: row
      ? {
          position: row.position_seconds,
          duration: row.duration_seconds,
          totalWatched: row.total_watched_seconds,
          qualified: row.qualified === 1,
          qualifiedSeconds: row.qualified_seconds,
          updatedAt: row.updated_at,
        }
      : null,
  })
})

const WATCH_CATEGORY_LABELS: Record<string, string> = {
  film: 'Filmler',
  dizi: 'Diziler',
  belgesel: 'Belgeseller',
  'kisa-film': 'Kısa Filmler',
  vertical: 'Dikey Diziler',
}

function resolveOwnedProfileId(req: AuthRequest, requestedProfileId?: string) {
  const profileId = requestedProfileId || getProfileId(req)
  if (!profileId) return null
  const owned = dbGet<{ id: string }>('SELECT id FROM profiles WHERE id = ? AND user_id = ?', [
    profileId,
    req.auth!.userId,
  ])
  return owned ? profileId : null
}

router.get('/stats', requireAuth, (req: AuthRequest, res) => {
  const requestedProfileId = req.query.profileId ? String(req.query.profileId) : undefined
  const profileId = resolveOwnedProfileId(req, requestedProfileId)
  if (!profileId) {
    res.status(400).json({ error: 'Profil gerekli.' })
    return
  }

  const totals = dbGet<{ total_seconds: number; total_titles: number }>(
    `SELECT
      COALESCE(SUM(total_watched_seconds), 0) as total_seconds,
      COUNT(DISTINCT content_id) as total_titles
    FROM watch_progress
    WHERE profile_id = ? AND total_watched_seconds > 0`,
    [profileId],
  )

  const rows = dbAll<{
    category: string
    total_seconds: number
    titles_watched: number
  }>(
    `SELECT
      CASE
        WHEN COALESCE(c.video_format, 'standard') = 'vertical' THEN 'vertical'
        ELSE c.type
      END as category,
      COALESCE(SUM(wp.total_watched_seconds), 0) as total_seconds,
      COUNT(DISTINCT wp.content_id) as titles_watched
    FROM watch_progress wp
    JOIN content c ON c.id = wp.content_id
    WHERE wp.profile_id = ? AND wp.total_watched_seconds > 0
    GROUP BY category
    ORDER BY total_seconds DESC`,
    [profileId],
  )

  res.json({
    totalSeconds: totals?.total_seconds ?? 0,
    totalTitles: totals?.total_titles ?? 0,
    byCategory: rows.map((row) => ({
      key: row.category,
      label: WATCH_CATEGORY_LABELS[row.category] ?? row.category,
      totalSeconds: row.total_seconds,
      titlesWatched: row.titles_watched,
    })),
  })
})

router.get('/all', requireAuth, (req: AuthRequest, res) => {
  const profileId = getProfileId(req)
  if (!profileId) {
    res.status(400).json({ error: 'Profil gerekli.' })
    return
  }

  const rows = dbAll<{
    content_id: string
    episode_id: string
    position_seconds: number
    duration_seconds: number
    total_watched_seconds: number
    qualified: number
    qualified_seconds: number
  }>(
    'SELECT content_id, episode_id, position_seconds, duration_seconds, total_watched_seconds, qualified, qualified_seconds FROM watch_progress WHERE profile_id = ?',
    [profileId],
  )

  res.json({
    items: rows.map((row) => ({
      contentId: row.content_id,
      episodeId: row.episode_id || null,
      position: row.position_seconds,
      duration: row.duration_seconds,
      totalWatched: row.total_watched_seconds,
      qualified: row.qualified === 1,
      qualifiedSeconds: row.qualified_seconds,
    })),
  })
})

router.post('/', requireAuth, (req: AuthRequest, res) => {
  const profileId = getProfileId(req)
  if (!profileId) {
    res.status(400).json({ error: 'Profil gerekli.' })
    return
  }

  const contentId = String(req.body.contentId ?? '')
  const episodeId = episodeKey(req.body.episodeId ? String(req.body.episodeId) : null)
  const position = Number(req.body.position ?? 0)
  const duration = Number(req.body.duration ?? 0)

  if (!contentId || !Number.isFinite(position)) {
    res.status(400).json({ error: 'Geçersiz veri.' })
    return
  }

  const content = dbGet<{ type: string; creator_id: string | null }>(
    'SELECT type, creator_id FROM content WHERE id = ?',
    [contentId],
  )

  const existing = dbGet<{
    position_seconds: number
    total_watched_seconds: number
    qualified: number
    qualified_seconds: number
  }>(
    'SELECT position_seconds, total_watched_seconds, qualified, qualified_seconds FROM watch_progress WHERE profile_id = ? AND content_id = ? AND episode_id = ?',
    [profileId, contentId, episodeId],
  )

  const delta = existing ? Math.max(0, position - existing.position_seconds) : position
  const totalWatched = (existing?.total_watched_seconds ?? 0) + delta

  const contentType = content ? normalizeContentType(content.type) : 'film'
  const wasQualified = existing?.qualified === 1
  const nowQualified = wasQualified || isQualifiedWatch(contentType, position, duration)
  const qualifiedDelta = nowQualified && delta > 0 ? delta : 0
  const qualifiedSeconds = (existing?.qualified_seconds ?? 0) + qualifiedDelta

  if (delta > 0) {
    dbRun(
      'INSERT INTO watch_activity (id, profile_id, content_id, seconds_watched, activity_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid(), profileId, contentId, delta, new Date().toISOString().slice(0, 10), new Date().toISOString()],
    )
  }

  if (qualifiedDelta > 0 && content?.creator_id) {
    dbRun(
      'INSERT INTO creator_qualified_activity (id, creator_id, content_id, episode_id, profile_id, seconds_watched, activity_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        uuid(),
        content.creator_id,
        contentId,
        episodeId,
        profileId,
        qualifiedDelta,
        new Date().toISOString().slice(0, 10),
        new Date().toISOString(),
      ],
    )
  }

  const existingRow = dbGet('SELECT profile_id FROM watch_progress WHERE profile_id = ? AND content_id = ? AND episode_id = ?', [
    profileId,
    contentId,
    episodeId,
  ])

  const now = new Date().toISOString()
  if (existingRow) {
    dbRun(
      'UPDATE watch_progress SET position_seconds = ?, duration_seconds = ?, total_watched_seconds = ?, qualified = ?, qualified_seconds = ?, updated_at = ? WHERE profile_id = ? AND content_id = ? AND episode_id = ?',
      [position, duration, totalWatched, nowQualified ? 1 : 0, qualifiedSeconds, now, profileId, contentId, episodeId],
    )
  } else {
    dbRun(
      'INSERT INTO watch_progress (profile_id, content_id, episode_id, position_seconds, duration_seconds, total_watched_seconds, qualified, qualified_seconds, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [profileId, contentId, episodeId, position, duration, totalWatched, nowQualified ? 1 : 0, qualifiedSeconds, now],
    )
  }

  res.json({ ok: true, totalWatched, qualified: nowQualified, qualifiedSeconds })
})

export default router
