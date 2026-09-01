import type { ContentItem } from '../types/content'
import {
  isFeaturedShowcaseRowId,
  isMonthlyEditorialRowTitle,
  STUDENT_CINEMA_ROW_ID,
  STUDENT_MONTHLY_WINNERS_ROW_ID,
  VERTICAL_SERIES_ROW_ID,
} from '../../shared/catalog/programRows'
import { isVerticalContent } from '../utils/vertical'

/** Guest home + "Ayın …" rows: centered 3×2 showcase grid. */
export function usesFeaturedShowcaseRow(title: string, rowId?: string) {
  if (rowId && isFeaturedShowcaseRowId(rowId)) return true
  if (isMonthlyEditorialRowTitle(title)) return true
  return false
}

export function browseRowLayout(rowId: string, items: ContentItem[], verticalOnly: boolean) {
  if (verticalOnly) return 'portrait' as const
  if (rowId === VERTICAL_SERIES_ROW_ID || items.every(isVerticalContent)) return 'portrait' as const
  return 'landscape' as const
}

export function browseRowOpensPlayer(rowId: string, verticalOnly: boolean) {
  return verticalOnly || rowId === VERTICAL_SERIES_ROW_ID
}

export function browseRowViewAllPath(
  rowId: string,
  options: { activeGenre: string | null; contentType: string | null; hiddenNavIds: string[] },
) {
  const { activeGenre, contentType, hiddenNavIds } = options
  if (activeGenre || contentType) return undefined
  if (rowId === STUDENT_CINEMA_ROW_ID && !hiddenNavIds.includes('gencSinema')) {
    return '/genc-sinema'
  }
  if (rowId === STUDENT_MONTHLY_WINNERS_ROW_ID && !hiddenNavIds.includes('gencSinema')) {
    return '/genc-sinema'
  }
  if (rowId === VERTICAL_SERIES_ROW_ID && !hiddenNavIds.includes('dikey')) {
    return '/dikey-diziler'
  }
  return undefined
}
