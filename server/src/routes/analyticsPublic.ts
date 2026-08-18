import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbGet, dbRun } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()
const ONLINE_WINDOW_MS = 2 * 60 * 1000

function getOptionalUserId(req: { headers: { authorization?: string } }) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    return verifyToken(header.slice(7)).userId
  } catch {
    return null
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

router.post('/visit', (req, res) => {
  const sessionId = String(req.body.sessionId ?? '').trim()
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId gerekli.' })
    return
  }

  const userId = getOptionalUserId(req)
  const visitDate = todayKey()
  const exists = dbGet(
    'SELECT id FROM site_visits WHERE session_id = ? AND visit_date = ?',
    [sessionId, visitDate],
  )

  if (!exists) {
    dbRun(
      'INSERT INTO site_visits (id, session_id, user_id, visit_date, created_at) VALUES (?, ?, ?, ?, ?)',
      [uuid(), sessionId, userId, visitDate, new Date().toISOString()],
    )
  }

  res.json({ ok: true })
})

router.post('/heartbeat', (req, res) => {
  const sessionId = String(req.body.sessionId ?? '').trim()
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId gerekli.' })
    return
  }

  const userId = getOptionalUserId(req)
  const profileId = req.body.profileId ? String(req.body.profileId) : null
  const now = new Date().toISOString()

  const existing = dbGet('SELECT session_id FROM online_presence WHERE session_id = ?', [sessionId])
  if (existing) {
    dbRun(
      'UPDATE online_presence SET user_id = ?, profile_id = ?, last_seen_at = ? WHERE session_id = ?',
      [userId, profileId, now, sessionId],
    )
  } else {
    dbRun(
      'INSERT INTO online_presence (session_id, user_id, profile_id, last_seen_at) VALUES (?, ?, ?, ?)',
      [sessionId, userId, profileId, now],
    )
  }

  res.json({ ok: true })
})

export { ONLINE_WINDOW_MS }
export default router
