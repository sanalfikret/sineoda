import type { CekimNotlariSection } from '../api/client'
import type { LandingCustomBlock } from '../constants/landingCustomBlocks'
import type { ContentItem } from '../types/content'

export function normalizeLandingLink(link: string) {
  const trimmed = String(link ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function resolveContentRowItemIds(
  block: LandingCustomBlock,
  cekimSections: CekimNotlariSection[] = [],
) {
  const manual = block.itemIds ?? []
  if (block.contentPool === 'shooting_notes' && block.sourceCategoryId) {
    const section = cekimSections.find((entry) => entry.id === block.sourceCategoryId)
    if (section?.items.length) {
      return section.items.map((item) => item.id)
    }
  }
  return manual
}

function buildContentLookup(catalog: ContentItem[], cekimSections: CekimNotlariSection[]) {
  const lookup = new Map<string, ContentItem>()
  for (const item of catalog) lookup.set(item.id, item)
  for (const section of cekimSections) {
    for (const item of section.items) {
      if (!lookup.has(item.id)) lookup.set(item.id, item as ContentItem)
    }
  }
  return lookup
}

export function resolveContentRowItems(
  block: LandingCustomBlock,
  catalog: ContentItem[],
  cekimSections: CekimNotlariSection[] = [],
) {
  const ids = resolveContentRowItemIds(block, cekimSections)
  const lookup = buildContentLookup(catalog, cekimSections)
  return ids.map((id) => lookup.get(id)).filter((item): item is ContentItem => Boolean(item))
}
