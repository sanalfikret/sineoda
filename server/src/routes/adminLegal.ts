import { dbAll } from '../db.js'
import { listAccess } from '../services/accessLog.js'
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

router.get('/submission-consents', requireAdmin, (req,res)=>{
  const offset=Math.max(0,Math.min(100000,Number(req.query.offset)||0))
  res.json({items:dbAll("SELECT id,user_name,user_email,accepted_at,ip_address,consent_text FROM legal_consents WHERE consent_type='creator_terms' ORDER BY accepted_at DESC LIMIT 50 OFFSET ?",[offset])})
})
router.get('/access-history', requireAdmin, (req, res) => {
  const offset = Math.max(0, Math.min(100000, Number(req.query.offset) || 0))
  res.json({items:listAccess(String(req.query.q ?? '').slice(0,100),offset)})
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

  const { title, sections, en } = req.body as Partial<LegalDocument>
  if (!Array.isArray(sections) || sections.length === 0) {
    res.status(400).json({ error: 'En az bir bölüm gerekli.' })
    return
  }

  if (!en?.title?.trim() || !Array.isArray(en.sections) || !en.sections.length || en.sections.some(s => !s.heading?.trim() || !s.body?.trim())) {
    res.status(400).json({error:'İngilizce başlık ve bölümler zorunludur.'}); return
  }
  const document = saveLegalDocument(slug, { title, sections, en })
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
