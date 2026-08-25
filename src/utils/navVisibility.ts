import { NAV_CATEGORY_SYNC, SITE_NAV_IDS, type SiteNavId } from '../constants/siteNav'
import type { ContentCategory, ContentItem } from '../types/content'

/** Eski API (siteNav yok) — bağlı kategorilerden menü gizliliğini çıkar. */
export function deriveHiddenNavFromCategories(categories: ContentCategory[]): SiteNavId[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const hidden: SiteNavId[] = []

  for (const navId of SITE_NAV_IDS) {
    if (navId === 'home') continue
    const linked = NAV_CATEGORY_SYNC[navId]
    if (linked.length === 0) continue
    if (linked.every((categoryId) => byId.get(categoryId)?.hidden)) {
      hidden.push(navId)
    }
  }

  return hidden
}

export function isNavHidden(navId: SiteNavId, hidden: SiteNavId[]) {
  return hidden.includes(navId)
}

export function isContentBlockedByNav(item: ContentItem, hiddenNav: SiteNavId[]) {
  if (hiddenNav.includes('dikey') && item.videoFormat === 'vertical') return true
  if (hiddenNav.includes('gencSinema') && item.program === 'student_cinema') return true
  if (hiddenNav.includes('diziler') && item.type === 'dizi') return true
  if (hiddenNav.includes('filmler') && item.type === 'film') return true
  if (hiddenNav.includes('belgeseller') && item.type === 'belgesel') return true
  return false
}

export function filterCatalogByNavVisibility(catalog: ContentItem[], hiddenNav: SiteNavId[]) {
  if (hiddenNav.length === 0) return catalog
  return catalog.filter((item) => !isContentBlockedByNav(item, hiddenNav))
}

export function filterVisibleCategories(categories: ContentCategory[]) {
  return categories.filter((category) => !category.hidden)
}

export function navIdForBrowseRoute(options: {
  contentType?: string | null
  verticalOnly?: boolean
  studentCinemaOnly?: boolean
  path?: string
}): SiteNavId | null {
  if (options.studentCinemaOnly) return 'gencSinema'
  if (options.verticalOnly) return 'dikey'
  if (options.contentType === 'dizi') return 'diziler'
  if (options.contentType === 'film') return 'filmler'
  if (options.contentType === 'belgesel') return 'belgeseller'
  if (options.path === '/listem') return 'listem'
  if (options.path === '/dergi' || options.path?.startsWith('/dergi/')) return 'dergi'
  return null
}
