import { isCekimCategoryId } from '../constants/cekimNotlari'
import { BRAND_STUDENT_CINEMA } from '../constants/brand'
import type { ContentItem, ContentType } from '../types/content'

export type ContentPoolId =
  | 'platform'
  | 'film'
  | 'dizi'
  | 'belgesel'
  | 'kisa-film'
  | 'vertical'
  | 'student_cinema'
  | 'shooting_notes'

export function isPlatformMainContent(item: Pick<ContentItem, 'program' | 'contentFormat'>) {
  return (item.program ?? 'standard') === 'standard' && (item.contentFormat ?? 'main') === 'main'
}

export function isStudentMainContent(item: Pick<ContentItem, 'program' | 'contentFormat'>) {
  return item.program === 'student_cinema' && (item.contentFormat ?? 'main') === 'main'
}

export function isShootingNotesContent(item: Pick<ContentItem, 'program'>) {
  return item.program === 'shooting_notes'
}

export function poolForShowcaseIcon(icon: string): ContentPoolId {
  switch (icon) {
    case 'genc-sinema':
      return 'student_cinema'
    case 'cekim-notlari':
      return 'shooting_notes'
    case 'kisa-film':
      return 'kisa-film'
    case 'dizi':
      return 'dizi'
    case 'film':
      return 'film'
    case 'belgesel':
      return 'belgesel'
    case 'dikey':
      return 'vertical'
    default:
      return 'platform'
  }
}

export function matchesContentPool(item: ContentItem, pool: ContentPoolId) {
  if (pool === 'student_cinema') return isStudentMainContent(item)
  if (pool === 'shooting_notes') return isShootingNotesContent(item)
  if (!isPlatformMainContent(item)) return false
  if (pool === 'platform') return true
  if (pool === 'vertical') return item.videoFormat === 'vertical'
  if (item.videoFormat === 'vertical') return false
  return item.type === (pool as ContentType)
}

export function contentAllowedInCategory(categoryId: string, item: ContentItem) {
  if (categoryId === BRAND_STUDENT_CINEMA.id) return isStudentMainContent(item)
  if (isCekimCategoryId(categoryId)) return isShootingNotesContent(item)
  return isPlatformMainContent(item)
}

export function filterCatalogByPool(catalog: ContentItem[], pool: ContentPoolId) {
  return catalog.filter((item) => matchesContentPool(item, pool))
}

export const LANDING_CONTENT_POOL_FILTERS: Array<{ id: ContentPoolId; label: string }> = [
  { id: 'platform', label: 'Platform (tümü)' },
  { id: 'film', label: 'Uzun metraj' },
  { id: 'dizi', label: 'Diziler' },
  { id: 'belgesel', label: 'Belgeseller' },
  { id: 'kisa-film', label: 'Kısa filmler' },
  { id: 'vertical', label: 'Dikey diziler' },
  { id: 'student_cinema', label: 'Öğrenci filmleri' },
  { id: 'shooting_notes', label: 'Ders notları' },
]
