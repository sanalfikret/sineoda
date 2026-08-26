import type { SiteNavId } from './siteNav'
import { isCekimCategoryId } from './cekimNotlari'

/** Menü ↔ kategori çift yönlü senkron (server ile aynı tablo). */
export const NAV_CATEGORY_SYNC: Record<SiteNavId, readonly string[]> = {
  home: [],
  diziler: ['series', 'anime-animation', 'crime'],
  filmler: ['comedy-specials', 'family', 'romance', 'standup', 'local', 'scifi-fantasy'],
  belgeseller: ['documentary'],
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
  if (isCekimCategoryId(categoryId)) return 'cekimNotlari'
  return categoryToNavMap.get(categoryId) ?? null
}

export const NAV_LABELS: Record<SiteNavId, string> = {
  home: 'Ana Sayfa',
  diziler: 'Diziler',
  filmler: 'Filmler',
  belgeseller: 'Belgeseller',
  dikey: 'Dikey Diziler',
  gencSinema: 'Genç Sinema',
  cekimNotlari: 'Çekim Notları',
  listem: 'Listem',
  dergi: 'Dergi',
}

/** Bağımsız kategori satırları — menü ile senkron değil */
export const STANDALONE_CATEGORY_IDS = new Set(['trending', 'new'])
