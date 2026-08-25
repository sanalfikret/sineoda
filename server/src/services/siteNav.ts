import { dbGet, dbRun } from '../db.js'
import {
  getCategoryIdsForNav,
  getNavIdForCategory,
  NAV_CATEGORY_SYNC,
} from '../constants/siteNavLinks.js'
import { SITE_NAV_IDS, SITE_NAV_ITEMS, type SiteNavId } from '../constants/siteNav.js'

export { SITE_NAV_IDS, SITE_NAV_ITEMS, type SiteNavId } from '../constants/siteNav.js'
export { NAV_CATEGORY_SYNC, NAV_LABELS, getNavIdForCategory, getCategoryIdsForNav } from '../constants/siteNavLinks.js'

const SETTINGS_KEY = 'nav_visibility'

export function getNavVisibility() {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) {
    return { hidden: [] as SiteNavId[] }
  }

  try {
    const parsed = JSON.parse(row.value) as { hidden?: unknown }
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((id): id is SiteNavId => SITE_NAV_IDS.includes(id as SiteNavId))
      : []
    return { hidden }
  } catch {
    return { hidden: [] as SiteNavId[] }
  }
}

export function saveNavVisibility(hidden: SiteNavId[]) {
  const unique = [...new Set(hidden.filter((id) => SITE_NAV_IDS.includes(id)))]
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify({ hidden: unique }),
  ])
  syncLinkedCategories(unique)
  return { hidden: unique }
}

export function syncLinkedCategories(hiddenNav: SiteNavId[]) {
  const hiddenSet = new Set(hiddenNav)
  for (const navId of SITE_NAV_IDS) {
    const shouldHide = hiddenSet.has(navId) ? 1 : 0
    for (const categoryId of getCategoryIdsForNav(navId)) {
      dbRun('UPDATE categories SET hidden = ? WHERE id = ?', [shouldHide, categoryId])
    }
  }
}

export function syncLinkedNavForCategory(categoryId: string, hidden: boolean) {
  const navId = getNavIdForCategory(categoryId)
  if (!navId) return getNavVisibility()

  const current = getNavVisibility()
  const nextHidden = new Set(current.hidden)
  if (hidden) nextHidden.add(navId)
  else nextHidden.delete(navId)
  return saveNavVisibility([...nextHidden])
}

export function mapSiteNavResponse() {
  const { hidden } = getNavVisibility()
  return {
    hidden,
    items: SITE_NAV_ITEMS.map((item) => ({
      ...item,
      hidden: hidden.includes(item.id),
    })),
    categorySync: NAV_CATEGORY_SYNC,
  }
}

export function navIdForPath(path: string): SiteNavId | null {
  if (path === '/') return 'home'
  if (path === '/dergi' || path.startsWith('/dergi/')) return 'dergi'
  const match = SITE_NAV_ITEMS.find((item) => item.path === path)
  return match?.id ?? null
}
