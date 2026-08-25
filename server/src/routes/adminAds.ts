import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import {
  createAdCampaign,
  deleteAdCampaign,
  getAdCampaign,
  listAdCampaigns,
  updateAdCampaign,
  type AdFrequency,
  type AdSkipMode,
} from '../services/adCampaigns.js'

const router = Router()

const FREQUENCIES: AdFrequency[] = ['once', 'every_play', 'monthly_once']
const SKIP_MODES: AdSkipMode[] = ['mandatory', 'skippable']

function parseCampaignBody(body: Record<string, unknown>) {
  const frequency = String(body.frequency ?? 'once') as AdFrequency
  const skipMode = String(body.skipMode ?? 'skippable') as AdSkipMode

  if (!FREQUENCIES.includes(frequency)) {
    throw new Error('Geçersiz gösterim sıklığı.')
  }
  if (!SKIP_MODES.includes(skipMode)) {
    throw new Error('Geçersiz atlama modu.')
  }

  const videoUrl = String(body.videoUrl ?? '').trim()
  if (!videoUrl) {
    throw new Error('Reklam videosu gerekli.')
  }

  const targetAll = body.targetAll === true || body.targetAll === 'true' || body.targetAll === 1
  const contentIds = Array.isArray(body.contentIds)
    ? body.contentIds.map((id) => String(id)).filter(Boolean)
    : []

  if (!targetAll && contentIds.length === 0) {
    throw new Error('En az bir film seçin veya tüm içeriklere uygulayın.')
  }

  return {
    name: String(body.name ?? 'Reklam kampanyası').trim() || 'Reklam kampanyası',
    videoUrl,
    kidsVideoUrl: body.kidsVideoUrl ? String(body.kidsVideoUrl).trim() : null,
    targetAll,
    contentIds,
    frequency,
    skipMode,
    skipAfterSeconds: Number(body.skipAfterSeconds ?? 5),
    startsAt: body.startsAt ? String(body.startsAt) : null,
    endsAt: body.endsAt ? String(body.endsAt) : null,
    isActive: body.isActive === true || body.isActive === 'true' || body.isActive === 1,
  }
}

router.get('/', requireAdmin, (_req, res) => {
  res.json({ campaigns: listAdCampaigns() })
})

router.get('/:id', requireAdmin, (req, res) => {
  const campaign = getAdCampaign(String(req.params.id))
  if (!campaign) {
    res.status(404).json({ error: 'Kampanya bulunamadı.' })
    return
  }
  res.json({ campaign })
})

router.post('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const input = parseCampaignBody(req.body as Record<string, unknown>)
    const campaign = createAdCampaign(input)
    res.status(201).json({ campaign })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Kaydedilemedi.' })
  }
})

router.put('/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const input = parseCampaignBody(req.body as Record<string, unknown>)
    const campaign = updateAdCampaign(String(req.params.id), input)
    if (!campaign) {
      res.status(404).json({ error: 'Kampanya bulunamadı.' })
      return
    }
    res.json({ campaign })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Güncellenemedi.' })
  }
})

router.patch('/:id/toggle', requireAdmin, (req, res) => {
  const existing = getAdCampaign(String(req.params.id))
  if (!existing) {
    res.status(404).json({ error: 'Kampanya bulunamadı.' })
    return
  }
  const campaign = updateAdCampaign(existing.id, { isActive: !existing.isActive })
  res.json({ campaign })
})

router.delete('/:id', requireAdmin, (req, res) => {
  deleteAdCampaign(String(req.params.id))
  res.json({ ok: true })
})

export default router
