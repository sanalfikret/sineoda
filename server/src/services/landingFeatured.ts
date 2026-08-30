import { dbRun } from '../db.js'
import { mapContent } from '../mappers.js'
import type { ContentRow } from '../types.js'
import { isContentPublished } from './publish.js'
import {
  getLandingHeroConfig,
  saveLandingHeroConfig,
  type LandingHeroConfig,
} from './landingHero.js'

type MappedContent = ReturnType<typeof mapContent>

function publishedCatalogItems(rows: ContentRow[]): MappedContent[] {
  return rows
    .filter((row) => isContentPublished(row.published_at))
    .map((row) => mapContent(row))
}

/** Ana sayfa hero — öne çıkan kutu (yalnızca yayındaki içerikler). */
export function resolveLandingFeaturedItem(
  hero: LandingHeroConfig,
  catalogRows: ContentRow[],
): MappedContent | null {
  if (hero.showFeaturedCard === false) return null

  const published = publishedCatalogItems(catalogRows)

  if (hero.featuredContentId) {
    const picked = published.find((item) => item.id === hero.featuredContentId)
    if (picked) return picked
  }

  return (
    published.find((item) => item.featured && item.program !== 'student_cinema') ??
    published.find((item) => item.program !== 'student_cinema') ??
    null
  )
}

/** İçerik listesinden öne çıkan seçildiğinde hero ayarını da güncelle. */
export function syncFeaturedContentSelection(contentId: string) {
  dbRun('UPDATE content SET featured = 0')
  dbRun('UPDATE content SET featured = 1 WHERE id = ?', [contentId])
  const hero = getLandingHeroConfig()
  saveLandingHeroConfig({ ...hero, featuredContentId: contentId })
}

/** Ana sayfa hero kaydında seçilen içeriği katalogda öne çıkan yap. */
export function syncFeaturedFromHero(hero: LandingHeroConfig) {
  if (!hero.featuredContentId) return
  dbRun('UPDATE content SET featured = 0')
  dbRun('UPDATE content SET featured = 1 WHERE id = ?', [hero.featuredContentId])
}
