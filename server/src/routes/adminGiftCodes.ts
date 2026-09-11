import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import {
  createGiftCode,
  deleteGiftCode,
  getGiftCodeById,
  listGiftCodeRedemptions,
  listGiftCodes,
  setGiftCodeEnabled,
} from '../services/giftCodes.js'

const router = Router()

router.get('/', requireAdmin, (_req, res) => {
  res.json({ codes: listGiftCodes() })
})

router.post('/', requireAdmin, (req, res) => {
  try {
    const code = createGiftCode({
      code: String(req.body.code ?? ''),
      label: String(req.body.label ?? ''),
      kind: String(req.body.kind ?? 'gift'),
      planId: String(req.body.planId ?? ''),
      durationMonths: Number(req.body.durationMonths ?? 0),
      durationYears: Number(req.body.durationYears ?? 0),
      discountPercent: Number(req.body.discountPercent ?? 0),
      discountAmount: Number(req.body.discountAmount ?? 0),
      maxUses: Number(req.body.maxUses ?? 1),
      expiresAt: req.body.expiresAt ? String(req.body.expiresAt) : null,
    })
    res.status(201).json({ code })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Kupon oluşturulamadı.' })
  }
})

router.get('/:id/redemptions', requireAdmin, (req, res) => {
  const code = getGiftCodeById(String(req.params.id))
  if (!code) {
    res.status(404).json({ error: 'Kupon bulunamadı.' })
    return
  }
  res.json({ code, redemptions: listGiftCodeRedemptions(code.id) })
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

router.delete('/:id', requireAdmin, (req, res) => {
  try {
    deleteGiftCode(String(req.params.id))
    res.status(204).send()
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Silinemedi.' })
  }
})

export default router
