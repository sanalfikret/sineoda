import { Router } from 'express'
import { applyCreatorReviewStatus } from '../services/creatorContentAdmin.js'
import { dbGet, dbRun, dbTransaction, dbAll } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'
import { mapContentAdmin } from '../mappers.js'
import { isLicenseExpiringSoon, isLicenseExpired } from '../services/license.js'
import type { ContentRow } from '../types.js'

const router = Router()

router.use(requireAdmin)

router.patch('/:id/publication', (req, res) => {
  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [req.params.id])
  if (!row) { res.status(404).json({error:'İçerik bulunamadı.'}); return }
  if (typeof req.body.publish !== 'boolean') { res.status(400).json({error:'Yayın seçimi gerekli.'}); return }
  try {
    dbTransaction(() => {
      if (req.body.publish) {
        if (isLicenseExpired(row.license_expires_at)) throw new Error('Telif süresi dolmuş. Önce telif tarihini güncelleyin.')
        if (row.creator_id) applyCreatorReviewStatus(row, 'published', {publishedAt:new Date().toISOString()})
        dbRun('UPDATE content SET published_at = ?, withdrawn_at = NULL WHERE id = ?', [new Date().toISOString(), row.id])
      } else {
        dbRun('UPDATE content SET published_at = NULL, withdrawn_at = COALESCE(withdrawn_at, ?) WHERE id = ?', [new Date().toISOString(), row.id])
      }
    })
    res.json({item:mapContentAdmin(dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [row.id])!)})
  } catch (err) { res.status(400).json({error:err instanceof Error ? err.message : 'Yayın güncellenemedi.'}) }
})

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
