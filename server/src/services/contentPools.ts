import { dbGet } from '../db.js'
import { isCekimCategoryId, isShootingNotesRow } from './cekimNotlari.js'
import { GENC_SINEMA_CATEGORY_ID } from './studentCinema.js'
import type { ContentRow } from '../types.js'

export type ContentPoolId =
  | 'platform'
  | 'film'
  | 'dizi'
  | 'belgesel'
  | 'kisa-film'
  | 'vertical'
  | 'student_cinema'
  | 'shooting_notes'

export function isPlatformMainContent(row: Pick<ContentRow, 'program' | 'content_format'>) {
  return (row.program ?? 'standard') === 'standard' && (row.content_format ?? 'main') === 'main'
}

export function isStudentMainContent(row: Pick<ContentRow, 'program' | 'content_format'>) {
  return (row.program ?? 'standard') === 'student_cinema' && (row.content_format ?? 'main') === 'main'
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

export function rowMatchesContentPool(
  row: Pick<ContentRow, 'program' | 'content_format' | 'type' | 'video_format'>,
  pool: ContentPoolId,
) {
  if (pool === 'student_cinema') return isStudentMainContent(row)
  if (pool === 'shooting_notes') return isShootingNotesRow(row)
  if (!isPlatformMainContent(row)) return false
  if (pool === 'platform') return true
  if (pool === 'vertical') return row.video_format === 'vertical'
  if (row.video_format === 'vertical') return false
  return row.type === pool
}

export function contentAllowedInCategory(
  categoryId: string,
  row: Pick<ContentRow, 'program' | 'content_format'>,
) {
  if (categoryId === GENC_SINEMA_CATEGORY_ID) return isStudentMainContent(row)
  if (isCekimCategoryId(categoryId)) return isShootingNotesRow(row)
  return isPlatformMainContent(row)
}

export function filterContentIdsForCategory(categoryId: string, itemIds: string[]) {
  const unique: string[] = []
  for (const contentId of itemIds) {
    const row = dbGet<Pick<ContentRow, 'program' | 'content_format'>>(
      'SELECT program, content_format FROM content WHERE id = ?',
      [contentId],
    )
    if (row && contentAllowedInCategory(categoryId, row) && !unique.includes(contentId)) {
      unique.push(contentId)
    }
  }
  return unique
}

export function filterContentIdsForPool(pool: ContentPoolId, itemIds: string[]) {
  const unique: string[] = []
  for (const contentId of itemIds) {
    const row = dbGet<Pick<ContentRow, 'program' | 'content_format' | 'type' | 'video_format'>>(
      'SELECT program, content_format, type, video_format FROM content WHERE id = ?',
      [contentId],
    )
    if (row && rowMatchesContentPool(row, pool) && !unique.includes(contentId)) {
      unique.push(contentId)
    }
  }
  return unique
}
