import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import {
  getBillingPlans,
  getBillingPlansConfig,
  getCustomBillingPlans,
  saveBillingPlansConfig,
  saveCustomBillingPlans,
  type BillingPlansConfig,
  type CustomBillingPlanInput,
} from '../services/billingPlansConfig.js'

const router = Router()

router.get('/', requireAdmin, (_req, res) => {
  res.json({
    plans: getBillingPlans({ includeDisabled: true }),
    overrides: getBillingPlansConfig(),
    customPlans: getCustomBillingPlans(),
  })
})

router.put('/', requireAdmin, (req: AuthRequest, res) => {
  const body = req.body as {
    plans?: BillingPlansConfig
    customPlans?: CustomBillingPlanInput[]
  }
  if (!body.plans || typeof body.plans !== 'object') {
    res.status(400).json({ error: 'Geçersiz plan verisi.' })
    return
  }

  try {
    saveBillingPlansConfig(body.plans)
    if (Array.isArray(body.customPlans)) {
      saveCustomBillingPlans(body.customPlans)
    }
    res.json({
      plans: getBillingPlans({ includeDisabled: true }),
      overrides: getBillingPlansConfig(),
      customPlans: getCustomBillingPlans(),
    })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Kayıt başarısız.' })
  }
})

export default router
