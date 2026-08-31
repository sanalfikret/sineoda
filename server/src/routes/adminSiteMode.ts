import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { getSiteMode, saveSiteMode } from '../services/siteMode.js'

const router = Router()

router.get('/', requireAdmin, (_req: AuthRequest, res) => {
  res.json({ siteMode: getSiteMode() })
})

router.patch('/', requireAdmin, (req: AuthRequest, res) => {
  const body = req.body as Record<string, unknown>
  const patch: Partial<ReturnType<typeof getSiteMode>> = {}

  if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
  if (body.launchAt === null || typeof body.launchAt === 'string') {
    patch.launchAt = body.launchAt === null ? null : String(body.launchAt)
  }
  if (typeof body.headline === 'string') patch.headline = body.headline
  if (typeof body.subheadline === 'string') patch.subheadline = body.subheadline
  if (typeof body.allowViewerSignup === 'boolean') patch.allowViewerSignup = body.allowViewerSignup

  res.json({ siteMode: saveSiteMode(patch) })
})

export default router
