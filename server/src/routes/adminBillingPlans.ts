import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import {
  getBillingPlans,
  getBillingPlansConfig,
  saveBillingPlansConfig,
  type BillingPlansConfig,
} from '../services/billingPlansConfig.js'

const router = Router()

router.get('/', requireAdmin, (_req, res) => {
  res.json({
    plans: getBillingPlans({ includeDisabled: true }),
    overrides: getBillingPlansConfig(),
  })
})

router.put('/', requireAdmin, (req: AuthRequest, res) => {
  const body = req.body as { plans?: BillingPlansConfig }
  if (!body.plans || typeof body.plans !== 'object') {
    res.status(400).json({ error: 'Geçersiz plan verisi.' })
    return
  }

  const saved = saveBillingPlansConfig(body.plans)
  res.json({
    plans: saved,
    overrides: getBillingPlansConfig(),
  })
})

export default router
