import { dbGet, dbRun } from '../db.js'

export const PLAYBACK_STALE_MS = 45_000

export type PlaybackSessionRow = {
  user_id: string
  session_id: string
  profile_id: string | null
  content_id: string
  episode_id: string
  started_at: string
  last_seen_at: string
}

export function claimPlaybackSession(input: {
  userId: string
  sessionId: string
  profileId: string | null
  contentId: string
  episodeId: string
}) {
  const now = new Date().toISOString()
  const existing = dbGet<PlaybackSessionRow>(
    'SELECT user_id, session_id, profile_id, content_id, episode_id, started_at, last_seen_at FROM playback_sessions WHERE user_id = ?',
    [input.userId],
  )

  if (existing) {
    dbRun(
      `UPDATE playback_sessions
       SET session_id = ?, profile_id = ?, content_id = ?, episode_id = ?, last_seen_at = ?
       WHERE user_id = ?`,
      [input.sessionId, input.profileId, input.contentId, input.episodeId, now, input.userId],
    )
    return {
      previousSessionId: existing.session_id !== input.sessionId ? existing.session_id : null,
    }
  }

  dbRun(
    `INSERT INTO playback_sessions (user_id, session_id, profile_id, content_id, episode_id, started_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.userId, input.sessionId, input.profileId, input.contentId, input.episodeId, now, now],
  )
  return { previousSessionId: null }
}

export function touchPlaybackSession(userId: string, sessionId: string) {
  const row = dbGet<PlaybackSessionRow>(
    'SELECT user_id, session_id, profile_id, content_id, episode_id, started_at, last_seen_at FROM playback_sessions WHERE user_id = ?',
    [userId],
  )
  if (!row) {
    return { active: false as const, reason: 'no_session' as const }
  }
  if (row.session_id !== sessionId) {
    return { active: false as const, reason: 'other_device' as const }
  }

  const now = new Date().toISOString()
  dbRun('UPDATE playback_sessions SET last_seen_at = ? WHERE user_id = ? AND session_id = ?', [
    now,
    userId,
    sessionId,
  ])
  return { active: true as const }
}

export function stopPlaybackSession(userId: string, sessionId: string) {
  dbRun('DELETE FROM playback_sessions WHERE user_id = ? AND session_id = ?', [userId, sessionId])
}

export function cleanupStalePlaybackSessions() {
  const cutoff = new Date(Date.now() - PLAYBACK_STALE_MS).toISOString()
  dbRun('DELETE FROM playback_sessions WHERE last_seen_at < ?', [cutoff])
}
