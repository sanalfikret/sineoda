import { Router } from 'express'
import {
  addDailyWatchSeconds,
  checkDailyWatchAllowance,
  getDailyWatchUsage,
  isDailyLimitReached,
  recordDailyTitleStart,
} from '../services/dailyWatchLimits.js'
import {
  cleanupStalePlaybackSessions,
  stopPlaybackSession,
  touchPlaybackSession,
  tryClaimPlaybackSession,
} from '../services/playbackSessions.js'
import { getProfileId, requireAuth, type AuthRequest } from '../middleware/auth.js'
import { assertSiteOpenForViewers } from '../services/siteMode.js'

const router = Router()

function episodeKey(value: unknown) {
  return value ? String(value) : ''
}

function isLimitExempt(req: AuthRequest) {
  const role = req.user?.role
  return role === 'admin' || role === 'manager'
}

router.get('/usage', requireAuth, (req: AuthRequest, res) => {
  const profileId = getProfileId(req)
  if (!profileId) {
    res.status(400).json({ error: 'Profil gerekli.' })
    return
  }
  res.json({ usage: getDailyWatchUsage(profileId) })
})

router.post('/start', requireAuth, (req: AuthRequest, res) => {
  const blocked = assertSiteOpenForViewers(req.user?.role)
  if (blocked) {
    res.status(blocked.status).json(blocked.body)
    return
  }

  const userId = req.user!.id
  const sessionId = String(req.body.sessionId ?? '').trim()
  const contentId = String(req.body.contentId ?? '').trim()
  const profileId = getProfileId(req)
  const episodeId = episodeKey(req.body.episodeId)

  if (!sessionId || !contentId || !profileId) {
    res.status(400).json({ error: 'sessionId, contentId ve profil gerekli.' })
    return
  }

  cleanupStalePlaybackSessions()

  const claim = tryClaimPlaybackSession({
    userId,
    sessionId,
    profileId,
    contentId,
    episodeId,
  })

  if (!claim.ok) {
    res.json({
      ok: true,
      allowed: false,
      active: false,
      reason: 'other_device',
      message: 'Başka bir cihazda izleme devam ediyor. Aynı anda yalnızca bir cihazdan izleyebilirsin.',
    })
    return
  }

  if (!isLimitExempt(req)) {
    const allowance = checkDailyWatchAllowance({ profileId, contentId, episodeId })
    if (!allowance.allowed) {
      stopPlaybackSession(userId, sessionId)
      const message =
        allowance.limitType === 'minutes'
          ? 'Bugünlük izleme süren doldu. Biraz dinlen — yarın kaldığın yerden devam edebilirsin.'
          : 'Bugün 3 içerik izledin. Biraz ara ver — yarın yeni filmler seni bekliyor.'
      res.json({
        ok: true,
        allowed: false,
        active: false,
        reason: 'daily_limit',
        limitType: allowance.limitType,
        message,
        usage: allowance.usage,
      })
      return
    }

    if (!allowance.alreadyStarted) {
      recordDailyTitleStart({ profileId, contentId, episodeId })
    }
  }

  res.json({
    ok: true,
    allowed: true,
    active: true,
    usage: profileId ? getDailyWatchUsage(profileId) : undefined,
  })
})

router.post('/heartbeat', requireAuth, (req: AuthRequest, res) => {
  const userId = req.user!.id
  const sessionId = String(req.body.sessionId ?? '').trim()
  const secondsDelta = Number(req.body.secondsDelta ?? 0)

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
          ? 'Başka bir cihazda izleme devam ediyor.'
          : 'Oynatma oturumu sona erdi.',
    })
    return
  }

  let usage = status.profileId ? getDailyWatchUsage(status.profileId) : undefined

  if (!isLimitExempt(req) && status.profileId && secondsDelta > 0) {
    usage = addDailyWatchSeconds(status.profileId, secondsDelta)
    if (isDailyLimitReached(status.profileId)) {
      res.json({
        ok: true,
        active: false,
        reason: 'daily_limit',
        message: 'Bugünlük izleme hakkın doldu. Biraz dinlen — yarın devam ederiz.',
        usage,
      })
      return
    }
  }

  res.json({ ok: true, active: true, usage })
})

router.post('/stop', requireAuth, (req: AuthRequest, res) => {
  const userId = req.user!.id
  const sessionId = String(req.body.sessionId ?? '').trim()
  const secondsDelta = Number(req.body.secondsDelta ?? 0)
  const profileId = getProfileId(req)

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId gerekli.' })
    return
  }

  if (!isLimitExempt(req) && profileId && secondsDelta > 0) {
    addDailyWatchSeconds(profileId, secondsDelta)
  }

  stopPlaybackSession(userId, sessionId)
  res.json({ ok: true, usage: profileId ? getDailyWatchUsage(profileId) : undefined })
})

export default router
