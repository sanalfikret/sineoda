import { Router } from 'express'
import { getProfileId, requireAuth, type AuthRequest } from '../middleware/auth.js'
import {
  claimPlaybackSession,
  cleanupStalePlaybackSessions,
  stopPlaybackSession,
  touchPlaybackSession,
} from '../services/playbackSessions.js'

const router = Router()

function episodeKey(value: unknown) {
  return value ? String(value) : ''
}

router.post('/start', requireAuth, (req: AuthRequest, res) => {
  const userId = req.user!.id
  const sessionId = String(req.body.sessionId ?? '').trim()
  const contentId = String(req.body.contentId ?? '').trim()

  if (!sessionId || !contentId) {
    res.status(400).json({ error: 'sessionId ve contentId gerekli.' })
    return
  }

  cleanupStalePlaybackSessions()

  const profileId = getProfileId(req)
  const episodeId = episodeKey(req.body.episodeId)
  const result = claimPlaybackSession({
    userId,
    sessionId,
    profileId,
    contentId,
    episodeId,
  })

  res.json({ ok: true, active: true, previousSessionId: result.previousSessionId })
})

router.post('/heartbeat', requireAuth, (req: AuthRequest, res) => {
  const userId = req.user!.id
  const sessionId = String(req.body.sessionId ?? '').trim()
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId gerekli.' })
    return
  }

  cleanupStalePlaybackSessions()
  const status = touchPlaybackSession(userId, sessionId)

  if (!status.active) {
    res.json({
      ok: true,
      active: false,
      reason: status.reason,
      message:
        status.reason === 'other_device'
          ? 'Hesabın başka bir cihazda izlemeye başladı.'
          : 'Oynatma oturumu sona erdi.',
    })
    return
  }

  res.json({ ok: true, active: true })
})

router.post('/stop', requireAuth, (req: AuthRequest, res) => {
  const userId = req.user!.id
  const sessionId = String(req.body.sessionId ?? '').trim()
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId gerekli.' })
    return
  }

  stopPlaybackSession(userId, sessionId)
  res.json({ ok: true })
})

export default router
