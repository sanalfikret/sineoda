import type { ContentItem } from '../types/content'
import type { BootstrapResponse, LandingConfigResponse } from '../api/client'

/** Admin içerik seçicileri için birden fazla kaynağı tek katalogda birleştirir (son kaynak önceliklidir). */
export function mergeAdminPickerCatalog(sources: ContentItem[][]): ContentItem[] {
  const byId = new Map<string, ContentItem>()
  for (const source of sources) {
    for (const item of source) {
      byId.set(item.id, item)
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.title.localeCompare(b.title, 'tr', { sensitivity: 'base' }),
  )
}

export function catalogItemsFromLanding(data: LandingConfigResponse): ContentItem[] {
  return [
    ...(data.slider ?? []),
    ...(data.studentPicks ?? []),
    ...(data.monthlyWinners ?? []),
    ...(data.showcases?.flatMap((showcase) => showcase.items) ?? []),
  ]
}

export function catalogItemsFromBootstrap(data: BootstrapResponse): ContentItem[] {
  return [
    ...(data.catalog ?? []),
    ...(data.studentCinemaCatalog ?? []),
    ...(data.studentCinemaPicks ?? []),
    ...(data.studentCinemaMonthlyWinners ?? []),
    ...(data.trailers ?? []),
    ...(data.newReleases ?? []),
    ...(data.landing ? catalogItemsFromLanding(data.landing) : []),
    ...(data.cekimNotlari?.sections?.flatMap((section) => section.items) ?? []),
  ]
}
