import { Router } from 'express'
import { ensureContentById } from '../catalogEnsure.js'
import { dbGet, dbRun } from '../db.js'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/:contentId', requireAuth, (req: AuthRequest, res) => {
  const profileId = req.headers['x-profile-id']
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).json({ error: 'Profil gerekli.' })
    return
  }

  const row = dbGet<{ reaction: string }>(
    'SELECT reaction FROM content_reactions WHERE profile_id = ? AND content_id = ?',
    [profileId, req.params.contentId],
  )

  res.json({ reaction: row?.reaction ?? null })
})

router.put('/:contentId', requireAuth, (req: AuthRequest, res) => {
  const profileId = req.headers['x-profile-id']
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).json({ error: 'Profil gerekli.' })
    return
  }

  const reaction = req.body?.reaction
  if (reaction !== 'like' && reaction !== 'dislike' && reaction !== null) {
    res.status(400).json({ error: 'Geçersiz tepki.' })
    return
  }

  if (reaction === null) {
    dbRun('DELETE FROM content_reactions WHERE profile_id = ? AND content_id = ?', [
      profileId,
      req.params.contentId,
    ])
    res.json({ reaction: null })
    return
  }

  if (!ensureContentById(req.params.contentId)) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }

  dbRun(
    `INSERT INTO content_reactions (profile_id, content_id, reaction, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(profile_id, content_id) DO UPDATE SET reaction = excluded.reaction, updated_at = excluded.updated_at`,
    [profileId, req.params.contentId, reaction, new Date().toISOString()],
  )

  res.json({ reaction })
})

export default router
