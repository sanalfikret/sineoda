import type { ContentItem, Episode } from '../types/content'

export function resolvePlayVideoUrl(item: Pick<ContentItem, 'videoUrl'>, episode?: Episode | null) {
  const episodeUrl = episode?.videoUrl?.trim()
  const mainUrl = item.videoUrl?.trim()
  return episodeUrl || mainUrl || ''
}
