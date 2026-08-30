import { Router } from 'express'
import { dbGet } from '../db.js'
import { optionalAuth, requireAuth, type AuthRequest } from '../middleware/auth.js'
import { listUserLegalConsents, recordLegalConsent } from '../services/legalConsent.js'
import {
  getLegalDocument,
  getLegalDocuments,
  getLegalVersion,
  validateLegalSlug,
} from '../services/legalDocuments.js'
import type { UserRow } from '../types.js'
import { getClientIp, getUserAgent } from '../utils/clientIp.js'

const router = Router()

router.get('/version', (_req, res) => {
  res.json({ version: getLegalVersion() })
})

router.get('/documents', (_req, res) => {
  res.json({
    version: getLegalVersion(),
    documents: getLegalDocuments(),
  })
})

router.get('/documents/:slug', (req, res) => {
  const slug = req.params.slug
  if (!validateLegalSlug(slug)) {
    res.status(404).json({ error: 'Yasal metin bulunamadı.' })
    return
  }
  res.json({ document: getLegalDocument(slug) })
})

router.get('/consents', requireAuth, (req: AuthRequest, res) => {
  const consents = listUserLegalConsents(req.auth!.userId)
  res.json({ consents })
})

router.post('/cookie-consent', optionalAuth, (req: AuthRequest, res) => {
  const { choice, sessionId, userName } = req.body as {
    choice?: 'accepted' | 'essential-only'
    sessionId?: string
    userName?: string
  }

  if (choice !== 'accepted' && choice !== 'essential-only') {
    res.status(400).json({ error: 'Geçersiz çerez tercihi.' })
    return
  }

  const ipAddress = getClientIp(req)
  const userAgent = getUserAgent(req)
  const acceptedAt = new Date().toISOString()

  let resolvedName = userName?.trim() || 'Ziyaretçi'
  let resolvedEmail: string | null = null
  if (req.auth?.userId) {
    const user = dbGet<UserRow>('SELECT name, email FROM users WHERE id = ?', [req.auth.userId])
    if (user) {
      resolvedName = user.name
      resolvedEmail = user.email
    }
  }

  const consent = recordLegalConsent({
    userId: req.auth?.userId ?? null,
    sessionId: sessionId?.trim() || null,
    type: 'cookies',
    userName: resolvedName,
    userEmail: resolvedEmail,
    ipAddress,
    userAgent,
    acceptedAt,
    cookieChoice: choice,
  })

  res.status(201).json({ consent })
})

export default router
