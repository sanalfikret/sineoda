import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { NAV_CATEGORY_SYNC } from '../constants/siteNavLinks.js'
import { mapCategoriesResponse } from '../services/categoryOrder.js'
import { mapSiteNavResponse, saveNavVisibility, SITE_NAV_IDS, type SiteNavId } from '../services/siteNav.js'

const router = Router()

router.get('/', requireAdmin, (_req: AuthRequest, res) => {
  res.json({ siteNav: mapSiteNavResponse() })
})

router.patch('/', requireAdmin, (req: AuthRequest, res) => {
  const hiddenInput = req.body.hidden
  if (!Array.isArray(hiddenInput)) {
    res.status(400).json({ error: 'hidden dizisi zorunlu.' })
    return
  }

  const hidden = hiddenInput.filter((id): id is SiteNavId =>
    SITE_NAV_IDS.includes(String(id) as SiteNavId),
  )
  const siteNav = saveNavVisibility(hidden)
  res.json({
    siteNav: {
      hidden: siteNav.hidden,
      items: mapSiteNavResponse().items,
      categorySync: NAV_CATEGORY_SYNC,
    },
    categories: mapCategoriesResponse(),
  })
})

export default router
