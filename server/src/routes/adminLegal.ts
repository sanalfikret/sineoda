import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import {
  getLegalDocument,
  getLegalDocuments,
  getLegalVersion,
  resetLegalDocument,
  saveLegalDocument,
  validateLegalSlug,
} from '../services/legalDocuments.js'
import type { LegalDocument } from '../constants/legalDefaults.js'

const router = Router()

router.get('/', requireAdmin, (_req: AuthRequest, res) => {
  res.json({
    version: getLegalVersion(),
    documents: getLegalDocuments(),
  })
})

router.get('/:slug', requireAdmin, (req: AuthRequest, res) => {
  const slug = req.params.slug
  if (!validateLegalSlug(slug)) {
    res.status(404).json({ error: 'Yasal metin bulunamadı.' })
    return
  }
  res.json({ document: getLegalDocument(slug) })
})

router.put('/:slug', requireAdmin, (req: AuthRequest, res) => {
  const slug = req.params.slug
  if (!validateLegalSlug(slug)) {
    res.status(404).json({ error: 'Yasal metin bulunamadı.' })
    return
  }

  const { title, sections } = req.body as Partial<LegalDocument>
  if (!Array.isArray(sections) || sections.length === 0) {
    res.status(400).json({ error: 'En az bir bölüm gerekli.' })
    return
  }

  const document = saveLegalDocument(slug, { title, sections })
  res.json({ document, version: getLegalVersion() })
})

router.post('/:slug/reset', requireAdmin, (req: AuthRequest, res) => {
  const slug = req.params.slug
  if (!validateLegalSlug(slug)) {
    res.status(404).json({ error: 'Yasal metin bulunamadı.' })
    return
  }

  const document = resetLegalDocument(slug)
  res.json({ document, version: getLegalVersion() })
})

export default router
