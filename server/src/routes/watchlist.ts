import { Router } from 'express'
import { ensureContentById } from '../catalogEnsure.js'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'
import { validateProfile } from '../middleware/profile.js'
import { mapContent } from '../mappers.js'
import type { ContentRow } from '../types.js'

const router = Router()

router.get('/', requireAuth, (req: AuthRequest, res) => {
  const profile = validateProfile(req, res)
  if (!profile) return

  const rows = dbAll<ContentRow>(
    `SELECT c.* FROM content c
     INNER JOIN watchlist w ON w.content_id = c.id
     WHERE w.profile_id = ?
     ORDER BY w.created_at DESC`,
    [profile.id],
  )

  res.json({ items: rows.map(mapContent) })
})

router.post('/:contentId', requireAuth, (req: AuthRequest, res) => {
  const profile = validateProfile(req, res)
  if (!profile) return

  const content = ensureContentById(req.params.contentId)
  if (!content) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }

  dbRun('INSERT OR IGNORE INTO watchlist (profile_id, content_id, created_at) VALUES (?, ?, ?)', [
    profile.id, req.params.contentId, new Date().toISOString(),
  ])
  res.status(201).json({ ok: true })
})

router.delete('/:contentId', requireAuth, (req: AuthRequest, res) => {
  const profile = validateProfile(req, res)
  if (!profile) return

  dbRun('DELETE FROM watchlist WHERE profile_id = ? AND content_id = ?', [
    profile.id,
    req.params.contentId,
  ])
  res.status(204).send()
})

export default router
