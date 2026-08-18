import type { ContentItem } from '../types/content'

export function isVerticalContent(item: Pick<ContentItem, 'videoFormat'>) {
  return item.videoFormat === 'vertical'
}

export function filterVerticalCatalog(catalog: ContentItem[]) {
  return catalog.filter(isVerticalContent)
}
