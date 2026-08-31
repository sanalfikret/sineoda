import type { LandingCustomBlock } from '../constants/landingCustomBlocks'
import type { ContentItem } from '../types/content'
import type { ContentPoolId } from './contentPools'
import { isShootingNotesContent, isStudentMainContent } from './contentPools'

export function viewAllHrefForPool(pool?: ContentPoolId) {
  switch (pool) {
    case 'shooting_notes':
      return '/cekim-notlari'
    case 'student_cinema':
      return '/genc-sinema'
    case 'dizi':
      return '/diziler'
    case 'film':
      return '/filmler'
    case 'belgesel':
      return '/belgeseller'
    case 'kisa-film':
      return '/filmler'
    case 'stand-up':
      return '/stand-up'
    case 'vertical':
      return '/dikey-diziler'
    default:
      return '/kayit'
  }
}

export function viewAllHrefForBlock(
  block: Pick<LandingCustomBlock, 'contentPool' | 'sourceCategoryId' | 'ctaLink'>,
) {
  if (block.contentPool === 'shooting_notes' && block.sourceCategoryId) {
    return `/cekim-notlari?kategori=${encodeURIComponent(block.sourceCategoryId)}`
  }
  return viewAllHrefForPool(block.contentPool)
}

/** Misafir ana sayfa — poster tıklanınca ilgili bölüme yönlendir */
export function guestItemHref(item: ContentItem) {
  if (isShootingNotesContent(item)) return '/cekim-notlari'
  if (isStudentMainContent(item)) return '/genc-sinema'
  if (item.videoFormat === 'vertical') return '/dikey-diziler'
  if (item.type === 'dizi') return '/diziler'
  if (item.type === 'belgesel') return '/belgeseller'
  if (item.type === 'stand-up') return '/stand-up'
  if (item.type === 'film' && item.genres.includes('Klasik')) return '/klasikler'
  return '/kayit'
}
