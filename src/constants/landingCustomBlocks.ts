import { createRandomId } from '../utils/id'

import type { ContentPoolId } from '../utils/contentPools'

export type LandingCustomBlockType = 'richText' | 'ctaBanner' | 'imageText' | 'contentRow'

export interface LandingCustomBlock {
  /** Layout kimliği: custom:{id} */
  id: string
  adminLabel: string
  type: LandingCustomBlockType
  /** contentRow: hangi içerik havuzundan seçim yapılır */
  contentPool?: ContentPoolId
  eyebrow: string
  title: string
  body: string
  image: string
  ctaLabel: string
  ctaLink: string
  ctaSecondaryLabel: string
  ctaSecondaryLink: string
  /** contentRow: seçili film/dizi id'leri */
  itemIds: string[]
}

export const CUSTOM_BLOCK_PREFIX = 'custom:'

export const CUSTOM_BLOCK_TYPE_LABELS: Record<LandingCustomBlockType, string> = {
  richText: 'Metin bloğu',
  ctaBanner: 'CTA / banner',
  imageText: 'Görsel + metin',
  contentRow: 'Film / dizi satırı',
}

export function customBlockLayoutId(id: string) {
  return `${CUSTOM_BLOCK_PREFIX}${id}`
}

export function isCustomLandingBlockId(value: string) {
  return value.startsWith(CUSTOM_BLOCK_PREFIX)
}

export function parseCustomBlockId(layoutId: string) {
  return layoutId.startsWith(CUSTOM_BLOCK_PREFIX) ? layoutId.slice(CUSTOM_BLOCK_PREFIX.length) : layoutId
}

export function createCustomBlockId() {
  return createRandomId()
}

export function createEmptyCustomBlock(type: LandingCustomBlockType = 'richText'): LandingCustomBlock {
  const id = createCustomBlockId()
  const base: LandingCustomBlock = {
    id,
    adminLabel: type === 'contentRow' ? 'İçerik satırı' : 'Yeni özel bölüm',
    type,
    eyebrow: '',
    title: type === 'contentRow' ? 'Öne çıkanlar' : '',
    body: '',
    image: '',
    ctaLabel: type === 'contentRow' ? 'Tümünü gör' : '',
    ctaLink: '/kayit',
    ctaSecondaryLabel: '',
    ctaSecondaryLink: '',
    itemIds: [],
  }
  return base
}
