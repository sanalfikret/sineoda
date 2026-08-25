import { Router } from 'express'
import { getProfileId, requireAuth, type AuthRequest } from '../middleware/auth.js'
import { recordAdView, resolveAdForContent } from '../services/adCampaigns.js'

const router = Router()

router.get('/for-content/:contentId', requireAuth, (req: AuthRequest, res) => {
  const contentId = String(req.params.contentId ?? '').trim()
  if (!contentId) {
    res.status(400).json({ error: 'İçerik kimliği gerekli.' })
    return
  }

  const isKidsHeader = req.headers['x-kids-profile']
  const isKidsProfile = isKidsHeader === '1' || isKidsHeader === 'true'

  const result = resolveAdForContent({
    contentId,
    userId: req.auth!.userId,
    isKidsProfile,
  })

  res.json(result)
})

router.post('/:campaignId/viewed', requireAuth, (req: AuthRequest, res) => {
  const campaignId = String(req.params.campaignId ?? '').trim()
  const contentId = String(req.body.contentId ?? '').trim()

  if (!campaignId || !contentId) {
    res.status(400).json({ error: 'Kampanya ve içerik gerekli.' })
    return
  }

  recordAdView({
    campaignId,
    userId: req.auth!.userId,
    profileId: getProfileId(req),
    contentId,
  })

  res.json({ ok: true })
})

export default router
