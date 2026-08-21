import type { ContentRow } from './types.js'

/** Ana sayfa editöryel satırları — seed ve birleştirme kurallarının tek kaynağı. */
export type EditorialCategoryRow = {
  id: string
  title: string
  sortOrder: number
  seedItems: readonly string[]
}

/** Tür satırı (genre-row-*) ile çakışan editöryel satırlar — birleştirme ve atlama kuralları. */
export type EditorialGenreMergeRule = {
  keepId: string
  canonicalTitle: string
  /** Birleştirilecek tür etiketleri ve eski başlıklar */
  mergeTitles: readonly string[]
  /** Birleştirilecek bilinen kategori id'leri (eski editöryel + genre-row) */
  mergeIds: readonly string[]
}

export const EDITORIAL_CATEGORY_ROWS: readonly EditorialCategoryRow[] = [
  {
    id: 'trending',
    title: 'Bu Hafta Trend',
    sortOrder: 0,
    seedItems: ['aurora-dreams', 'neon-pulse', 'code-breakers', 'ocean-whispers'],
  },
  {
    id: 'new',
    title: 'Yeni Eklenenler',
    sortOrder: 1,
    seedItems: ['aurora-dreams', 'ocean-whispers', 'neon-pulse', 'little-stars', 'kalp-satirlari'],
  },
  {
    id: 'series',
    title: 'Popüler Diziler',
    sortOrder: 2,
    seedItems: ['code-breakers', 'neon-pulse', 'chef-table', 'kalp-satirlari', 'anime-horizon'],
  },
  {
    id: 'documentary',
    title: 'Belgeseller',
    sortOrder: 3,
    seedItems: ['golden-era', 'chef-table', 'wild-planet'],
  },
  { id: 'standup', title: 'Stand-up', sortOrder: 4, seedItems: ['stage-lights'] },
  {
    id: 'family',
    title: 'Aile Filmleri',
    sortOrder: 5,
    seedItems: ['little-stars'],
  },
  {
    id: 'anime-animation',
    title: 'Anime + Animasyon',
    sortOrder: 6,
    seedItems: ['little-stars', 'anime-horizon'],
  },
  {
    id: 'vertical-series',
    title: 'Dikey Diziler',
    sortOrder: 8,
    seedItems: ['kalp-satirlari'],
  },
  {
    id: 'local',
    title: 'Yerli Yapımlar',
    sortOrder: 9,
    seedItems: ['wind-road', 'midnight-istanbul', 'golden-era', 'stage-lights'],
  },
  {
    id: 'crime',
    title: 'Suç-Gizem',
    sortOrder: 10,
    seedItems: ['neon-pulse', 'silent-forest', 'code-breakers'],
  },
  {
    id: 'romance',
    title: 'Romantik',
    sortOrder: 11,
    seedItems: ['kalp-satirlari', 'midnight-istanbul', 'wind-road'],
  },
  {
    id: 'scifi-fantasy',
    title: 'Bilim Kurgu ve Fantastik',
    sortOrder: 12,
    seedItems: ['aurora-dreams', 'ocean-whispers', 'anime-horizon'],
  },
  {
    id: 'comedy-specials',
    title: 'Komedi Filmleri',
    sortOrder: 13,
    seedItems: ['stage-lights', 'little-stars', 'chef-table'],
  },
]

export const EDITORIAL_GENRE_MERGE_RULES: readonly EditorialGenreMergeRule[] = [
  {
    keepId: 'documentary',
    canonicalTitle: 'Belgeseller',
    mergeTitles: ['Belgesel'],
    mergeIds: ['genre-row-belgesel'],
  },
  {
    keepId: 'family',
    canonicalTitle: 'Aile Filmleri',
    mergeTitles: ['Aile', 'Aile İçin'],
    mergeIds: ['genre-row-aile'],
  },
  {
    keepId: 'anime-animation',
    canonicalTitle: 'Anime + Animasyon',
    mergeTitles: ['Animasyon', 'Anime'],
    mergeIds: ['animation', 'anime', 'genre-row-anime', 'genre-row-animasyon'],
  },
  {
    keepId: 'local',
    canonicalTitle: 'Yerli Yapımlar',
    mergeTitles: ['Yerli'],
    mergeIds: ['genre-row-yerli'],
  },
  {
    keepId: 'crime',
    canonicalTitle: 'Suç-Gizem',
    mergeTitles: ['Suç', 'Gizem', 'Suç ve Gizem', 'Suç Gizem'],
    mergeIds: ['genre-row-suc', 'genre-row-gizem'],
  },
  {
    keepId: 'comedy-specials',
    canonicalTitle: 'Komedi Filmleri',
    mergeTitles: ['Komedi', 'Komedi Özel'],
    mergeIds: ['genre-row-komedi'],
  },
]

export function normalizeCategoryTitle(title: string) {
  return title
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/\s+ve\s+/g, '-')
    .replace(/\s*\+\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function buildGenreToEditorialIdMap() {
  const map: Record<string, string> = {}
  for (const rule of EDITORIAL_GENRE_MERGE_RULES) {
    for (const title of rule.mergeTitles) {
      map[title] = rule.keepId
    }
  }
  return map
}

export function editorialCategoryLabels() {
  return EDITORIAL_CATEGORY_ROWS.map((row) => row.title)
}

/** Editöryel satır doldurma kuralları. null = bu başlık için özel kural yok. */
export function matchesEditorialFillRule(
  categoryTitle: string,
  row: ContentRow,
  genres: string[],
): boolean | null {
  const title = normalizeCategoryTitle(categoryTitle)
  const vertical = row.video_format === 'vertical'
  const is = (label: string) => title === normalizeCategoryTitle(label)

  if (is('Bu Hafta Trend')) return Boolean(row.featured) || Boolean(row.is_new)
  if (is('Yeni Eklenenler')) return Boolean(row.is_new)
  if (is('Popüler Diziler')) return row.type === 'dizi' && !vertical
  if (is('Belgeseller')) return row.type === 'belgesel'
  if (is('Dikey Diziler')) return vertical
  if (is('Aile Filmleri') || is('Aile İçin')) {
    return genres.some((g) => ['Aile', 'Animasyon', 'Çocuk'].includes(g))
  }
  if (is('Anime + Animasyon') || is('Anime') || is('Animasyon')) {
    return genres.some((g) => ['Anime', 'Animasyon'].includes(g))
  }
  if (is('Stand-up')) return genres.includes('Stand-up')
  if (is('Yerli Yapımlar')) return genres.includes('Yerli')
  if (is('Suç-Gizem') || is('Suç ve Gizem')) {
    return genres.some((g) => ['Suç', 'Gizem', 'Gerilim'].includes(g))
  }
  if (is('Romantik')) return genres.includes('Romantik')
  if (is('Bilim Kurgu ve Fantastik')) {
    return genres.some((g) => ['Bilim Kurgu', 'Fantastik'].includes(g))
  }
  if (is('Komedi Filmleri') || is('Komedi Özel')) return genres.includes('Komedi')

  return null
}
