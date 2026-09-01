import type { ContentRow } from './types.js'
import {
  EDITORIAL_CATEGORY_ROWS,
  EDITORIAL_GENRE_MERGE_RULES,
  buildGenreToEditorialIdMap,
  editorialCategoryLabels,
  findEditorialRowByTitle,
  normalizeCategoryTitle,
  type EditorialCategoryRow,
  type EditorialGenreMergeRule,
} from '../../shared/catalog/editorialRows.js'

export type { EditorialCategoryRow, EditorialGenreMergeRule }

export {
  EDITORIAL_CATEGORY_ROWS,
  EDITORIAL_GENRE_MERGE_RULES,
  buildGenreToEditorialIdMap,
  editorialCategoryLabels,
  normalizeCategoryTitle,
}

/** Editöryel satır doldurma kuralları. null = bu başlık için özel kural yok. */
export function matchesEditorialFillRule(
  categoryTitle: string,
  row: ContentRow,
  genres: string[],
): boolean | null {
  const editorial = findEditorialRowByTitle(categoryTitle)
  if (!editorial) return null

  const vertical = row.video_format === 'vertical'

  switch (editorial.id) {
    case 'trending':
      return Boolean(row.featured) || Boolean(row.is_new)
    case 'new':
      return Boolean(row.is_new)
    case 'series':
      return row.type === 'dizi' && !vertical
    case 'documentary':
      return row.type === 'belgesel'
    case 'vertical-series':
      return vertical
    case 'family':
      return genres.some((g) => ['Aile', 'Animasyon', 'Çocuk'].includes(g))
    case 'anime-animation':
      return genres.some((g) => ['Anime', 'Animasyon'].includes(g))
    case 'standup':
      return row.type === 'stand-up' || genres.includes('Stand-up')
    case 'classics':
      return row.type === 'film' && genres.includes('Klasik')
    case 'local':
      return genres.includes('Yerli')
    case 'crime':
      return genres.some((g) => ['Suç', 'Gizem', 'Gerilim'].includes(g))
    case 'romance':
      return genres.includes('Romantik')
    case 'scifi-fantasy':
      return genres.some((g) => ['Bilim Kurgu', 'Fantastik'].includes(g))
    case 'comedy-specials':
      return genres.includes('Komedi')
    default:
      return null
  }
}
