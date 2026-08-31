import type { SiteNavId } from './siteNav.js'
import { isCekimCategoryId } from './cekimNotlari.js'

/** Menü ↔ kategori çift yönlü senkron. */
export const NAV_CATEGORY_SYNC: Record<SiteNavId, readonly string[]> = {
  home: [],
  diziler: ['series', 'anime-animation', 'crime'],
  filmler: ['comedy-specials', 'family', 'romance', 'local', 'scifi-fantasy'],
  belgeseller: ['documentary'],
  standup: ['standup'],
  dikey: ['vertical-series'],
  gencSinema: ['genc-sinema'],
  cekimNotlari: [],
  listem: [],
  dergi: [],
}

const categoryToNavMap = new Map<string, SiteNavId>()
for (const [navId, categoryIds] of Object.entries(NAV_CATEGORY_SYNC) as [SiteNavId, readonly string[]][]) {
  for (const categoryId of categoryIds) {
    categoryToNavMap.set(categoryId, navId)
  }
}

export function getNavIdForCategory(categoryId: string): SiteNavId | null {
  if (isCekimCategoryId(categoryId)) return null
  return categoryToNavMap.get(categoryId) ?? null
}

export function getCategoryIdsForNav(navId: SiteNavId): readonly string[] {
  if (navId === 'cekimNotlari') return []
  return NAV_CATEGORY_SYNC[navId] ?? []
}

/** Menü etiketleri (admin ipuçları) */
export const NAV_LABELS: Record<SiteNavId, string> = {
  home: 'Ana Sayfa',
  diziler: 'Diziler',
  filmler: 'Filmler',
  belgeseller: 'Belgeseller',
  standup: 'Stand-up',
  dikey: 'Dikey Diziler',
  gencSinema: 'Genç Sinema',
  cekimNotlari: 'Çekim Notları',
  listem: 'Listem',
  dergi: 'Dergi',
}
