import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import {
  createInviteBatch,
  deleteInviteBatch,
  getInviteStats,
  listBatchCodes,
  listInviteBatches,
  revokeInviteBatch,
  revokeInviteCode,
} from '../services/inviteCodes.js'
import { getSiteMode } from '../services/siteMode.js'

const router = Router()

router.get('/', requireAdmin, (_req, res) => {
  res.json({ inviteOnly: getSiteMode().inviteOnly, stats: getInviteStats(), batches: listInviteBatches() })
})

router.post('/batch', requireAdmin, (req, res) => {
  try {
    const batch = createInviteBatch({
      count: Number(req.body.count ?? 0),
      label: String(req.body.label ?? ''),
      prefix: String(req.body.prefix ?? 'PLOOY'),
      planId: String(req.body.planId ?? 'standard'),
      grantMonths: Number(req.body.grantMonths ?? 0),
      expiresAt: req.body.expiresAt ? String(req.body.expiresAt) : null,
    })
    res.status(201).json({ batch, stats: getInviteStats(), batches: listInviteBatches() })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Davet paketi oluşturulamadı.' })
  }
})

router.get('/batch/:id/codes', requireAdmin, (req, res) => {
  const filterRaw = String(req.query.status ?? 'all')
  const filter = ['all', 'active', 'used', 'revoked'].includes(filterRaw) ? (filterRaw as 'all' | 'active' | 'used' | 'revoked') : 'all'
  const codes = listBatchCodes(String(req.params.id), filter)
  if (String(req.query.format ?? '') === 'txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="davet-kodlari-${req.params.id.slice(0, 8)}.txt"`)
    res.send(codes.map((entry) => entry.code).join('\n'))
    return
  }
  res.json({ codes })
})

router.post('/batch/:id/revoke', requireAdmin, (req, res) => {
  try {
    const batch = revokeInviteBatch(String(req.params.id))
    res.json({ batch, stats: getInviteStats(), batches: listInviteBatches() })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Paket iptal edilemedi.' })
  }
})

router.delete('/batch/:id', requireAdmin, (req, res) => {
  try {
    deleteInviteBatch(String(req.params.id))
    res.json({ ok: true, stats: getInviteStats(), batches: listInviteBatches() })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Paket silinemedi.' })
  }
})

router.post('/code/:code/revoke', requireAdmin, (req, res) => {
  try {
    revokeInviteCode(String(req.params.code))
    res.json({ ok: true, stats: getInviteStats() })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Kod iptal edilemedi.' })
  }
})

export default router
