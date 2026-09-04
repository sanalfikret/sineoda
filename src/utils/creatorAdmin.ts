import { isContentScheduled } from './publish'

type CreatorFilmItem = {
  reviewStatus: string
  publishedAt?: string | null
}

export function categorizeCreatorFilm(item: CreatorFilmItem): 'published' | 'scheduled' | 'review' | 'rejected' {
  if (item.reviewStatus === 'rejected') return 'rejected'
  if (item.reviewStatus === 'published' && isContentScheduled(item.publishedAt)) return 'scheduled'
  if (item.reviewStatus === 'published') return 'published'
  if (
    item.reviewStatus === 'pending' ||
    item.reviewStatus === 'payment_pending' ||
    item.reviewStatus === 'draft'
  ) {
    return 'review'
  }
  return 'review'
}
