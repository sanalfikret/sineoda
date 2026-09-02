import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { createGiftCode, listGiftCodes, setGiftCodeEnabled } from '../services/giftCodes.js'

const router = Router()

router.get('/', requireAdmin, (_req, res) => {
  res.json({ codes: listGiftCodes() })
})

router.post('/', requireAdmin, (req, res) => {
  try {
    const code = createGiftCode({
      code: String(req.body.code ?? ''),
      label: String(req.body.label ?? ''),
      planId: String(req.body.planId ?? 'standard'),
      durationMonths: Number(req.body.durationMonths ?? 0),
      durationYears: Number(req.body.durationYears ?? 0),
      maxUses: Number(req.body.maxUses ?? 1),
      expiresAt: req.body.expiresAt ? String(req.body.expiresAt) : null,
    })
    res.status(201).json({ code })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Kupon oluşturulamadı.' })
  }
})

router.patch('/:id', requireAdmin, (req, res) => {
  try {
    const enabled = req.body.enabled
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled alanı zorunlu.' })
      return
    }
    const code = setGiftCodeEnabled(String(req.params.id), enabled)
    res.json({ code })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Güncellenemedi.' })
  }
})

export default router
