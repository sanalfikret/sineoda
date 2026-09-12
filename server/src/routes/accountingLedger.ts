import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import {
  getAccountingRules,
  saveAccountingRules,
  listNewAccountingMonths,
  getAccountingReport,
  markAccountingPaid,
  undoAccountingPaid,
  saveAccountingFinance,
} from '../services/accountingLedger.js'
import { dbAll } from '../db.js'

const router = Router()
router.use(requireAdmin)

const fail = (res: { status: (code: number) => { json: (body: unknown) => void } }, e: unknown, fallback: string) =>
  res.status(400).json({ error: e instanceof Error ? e.message : fallback })

router.get('/', (_req, res) => {
  res.json({ rules: getAccountingRules(), months: listNewAccountingMonths(), categories: dbAll('SELECT id,title FROM categories ORDER BY sort_order,id') })
})
router.get('/:month', (req, res) => {
  try { res.json({ report: getAccountingReport(String(req.params.month)) }) } catch (e) { fail(res, e, 'Rapor alınamadı.') }
})
router.put('/rules', (req, res) => {
  try { res.json({ rules: saveAccountingRules(req.body) }) } catch (e) { fail(res, e, 'Kaydedilemedi.') }
})
/** Ayın gider/kesinti ve (isteğe bağlı) elle dağıtılabilir net girişi. Ödeme kaydı olan ayda kilitlidir. */
router.put('/:month/finance', (req, res) => {
  try { res.json({ report: saveAccountingFinance(String(req.params.month), req.body ?? {}) }) } catch (e) { fail(res, e, 'Kaydedilemedi.') }
})
/** Banka havalesi yapıldıktan sonra kayıt: tutar ve IBAN o anki haliyle saklanır. Para transferi yapmaz. */
router.post('/:month/paid', (req: AuthRequest, res) => {
  try { res.json({ report: markAccountingPaid(String(req.params.month), String(req.body.creatorId ?? ''), req.body.reference, req.auth!.userId) }) } catch (e) { fail(res, e, 'Kaydedilemedi.') }
})
router.delete('/:month/paid/:creatorId', (req, res) => {
  try { res.json({ report: undoAccountingPaid(String(req.params.month), String(req.params.creatorId)) }) } catch (e) { fail(res, e, 'Geri alınamadı.') }
})

export default router
