/** Home browse editorial rows — single source for seed, dedup, and i18n keys. */

export type EditorialCategoryRow = {
  id: string
  title: string
  sortOrder: number
  seedItems: readonly string[]
}

export type EditorialGenreMergeRule = {
  keepId: string
  canonicalTitle: string
  mergeTitles: readonly string[]
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
    id: 'classics',
    title: 'Klasikler',
    sortOrder: 5,
    seedItems: ['wind-road', 'midnight-istanbul'],
  },
  {
    id: 'family',
    title: 'Aile Filmleri',
    sortOrder: 6,
    seedItems: ['little-stars'],
  },
  {
    id: 'anime-animation',
    title: 'Anime + Animasyon',
    sortOrder: 7,
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
  {
    keepId: 'romance',
    canonicalTitle: 'Romantik',
    mergeTitles: ['Romantik'],
    mergeIds: ['genre-row-romantik'],
  },
  {
    keepId: 'standup',
    canonicalTitle: 'Stand-up',
    mergeTitles: ['Stand-up'],
    mergeIds: ['genre-row-stand-up'],
  },
  {
    keepId: 'classics',
    canonicalTitle: 'Klasikler',
    mergeTitles: ['Klasik'],
    mergeIds: ['genre-row-klasik'],
  },
  {
    keepId: 'scifi-fantasy',
    canonicalTitle: 'Bilim Kurgu ve Fantastik',
    mergeTitles: ['Bilim Kurgu', 'Fantastik'],
    mergeIds: ['genre-row-bilim-kurgu', 'genre-row-fantastik'],
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

export function findEditorialRowByTitle(title: string) {
  const normalized = normalizeCategoryTitle(title)
  return EDITORIAL_CATEGORY_ROWS.find((row) => normalizeCategoryTitle(row.title) === normalized) ?? null
}

export function buildGenreToEditorialIdMap() {
  const map: Record<string, string> = {}
  for (const rule of EDITORIAL_GENRE_MERGE_RULES) {
    for (const mergeTitle of rule.mergeTitles) {
      map[mergeTitle] = rule.keepId
    }
  }
  return map
}

export function editorialCategoryLabels() {
  return EDITORIAL_CATEGORY_ROWS.map((row) => row.title)
}

export function editorialCategoryIds() {
  return EDITORIAL_CATEGORY_ROWS.map((row) => row.id)
}
