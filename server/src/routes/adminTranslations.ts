import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { dbGet } from '../db.js'
import { readTranslations, saveTranslations, type TranslationKind } from '../services/dynamicTranslations.js'
const router = Router()
router.use(requireAdmin)
router.get('/:kind/:id', (req, res) => {
  const kind = req.params.kind as TranslationKind
  if (!['content', 'categories'].includes(kind)) { res.sendStatus(404); return }
  const row = dbGet<{ title: string; description?: string }>('SELECT * FROM ' + kind + ' WHERE id = ?', [req.params.id])
  if (!row) { res.sendStatus(404); return }
  res.json({ translations: { tr: { title: row.title, description: row.description ?? '' }, en: { title: '', description: '' }, ...readTranslations(kind, req.params.id) } })
})
router.patch('/:kind/:id', (req, res) => {
  const kind = req.params.kind as TranslationKind
  if (!['content', 'categories'].includes(kind)) { res.sendStatus(404); return }
  try { saveTranslations(kind, req.params.id, req.body.translations); res.json({ translations: readTranslations(kind, req.params.id) }) }
  catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : 'Kaydedilemedi.' }) }
})
export default router
