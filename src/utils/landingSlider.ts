import type { ContentItem } from '../types/content'
import type { LandingConfigResponse } from '../api/client'

export function resolveLandingSliderItems(
  landing: Pick<LandingConfigResponse, 'slider' | 'sliderContentIds'> | null | undefined,
  catalog: ContentItem[],
  fallbackTrailers: ContentItem[] = [],
): ContentItem[] {
  if (landing?.slider?.length) {
    return landing.slider.slice(0, 12)
  }

  const contentIds = landing?.sliderContentIds ?? []
  if (contentIds.length > 0) {
    const catalogMap = new Map(catalog.map((item) => [item.id, item]))
    const resolved = contentIds
      .map((contentId) => catalogMap.get(contentId))
      .filter((item): item is ContentItem => Boolean(item))
    if (resolved.length > 0) {
      return resolved.slice(0, 12)
    }
  }

  if (fallbackTrailers.length > 0) {
    return fallbackTrailers.slice(0, 8)
  }

  return []
}
