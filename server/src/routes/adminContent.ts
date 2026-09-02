import { Router } from 'express'
import { dbAll } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'
import { mapContentAdmin } from '../mappers.js'
import { isLicenseExpiringSoon, isLicenseExpired } from '../services/license.js'
import type { ContentRow } from '../types.js'

const router = Router()

router.use(requireAdmin)

router.get('/', (_req, res) => {
  const catalog = dbAll<ContentRow>('SELECT * FROM content ORDER BY title').map(mapContentAdmin)
  res.json({ catalog })
})

router.get('/expiring', (req, res) => {
  try {
    const withinDays = Math.max(1, Math.min(365, Number(req.query.days ?? 30) || 30))
    const catalog = dbAll<ContentRow>('SELECT * FROM content ORDER BY license_expires_at ASC, title')
      .map(mapContentAdmin)
      .filter((item) => item.licenseExpiresAt && isLicenseExpiringSoon(item.licenseExpiresAt, withinDays))
      .sort((a, b) => {
        const aDays = a.licenseDaysRemaining ?? 9999
        const bDays = b.licenseDaysRemaining ?? 9999
        return aDays - bDays
      })

    res.json({ items: catalog, withinDays })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Telif listesi yüklenemedi.' })
  }
})

router.get('/expired', (_req, res) => {
  const catalog = dbAll<ContentRow>('SELECT * FROM content ORDER BY license_expires_at ASC, title')
    .map(mapContentAdmin)
    .filter((item) => item.licenseExpiresAt && isLicenseExpired(item.licenseExpiresAt))

  res.json({ items: catalog })
})

export default router
