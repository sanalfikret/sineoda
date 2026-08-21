import { resolveMediaUrl, type LandingHeroConfig } from '../api/client'
import type { ContentItem } from '../types/content'

export function resolveHeroBackground(
  hero: LandingHeroConfig,
  content: ContentItem | null,
  fallbackImage: string,
) {
  if (hero.backgroundImage) {
    return { kind: 'image' as const, src: resolveMediaUrl(hero.backgroundImage) }
  }

  if (hero.backgroundVideo) {
    return { kind: 'video' as const, src: resolveMediaUrl(hero.backgroundVideo) }
  }

  if (content) {
    return {
      kind: 'image' as const,
      src: resolveMediaUrl(content.backdrop || content.poster),
    }
  }

  return { kind: 'image' as const, src: fallbackImage }
}
