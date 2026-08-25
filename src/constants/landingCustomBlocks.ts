import { createRandomId } from '../utils/id'

export type LandingCustomBlockType = 'richText' | 'ctaBanner' | 'imageText'

export interface LandingCustomBlock {
  /** Layout kimliği: custom:{id} */
  id: string
  adminLabel: string
  type: LandingCustomBlockType
  eyebrow: string
  title: string
  body: string
  image: string
  ctaLabel: string
  ctaLink: string
  ctaSecondaryLabel: string
  ctaSecondaryLink: string
}

export const CUSTOM_BLOCK_PREFIX = 'custom:'

export const CUSTOM_BLOCK_TYPE_LABELS: Record<LandingCustomBlockType, string> = {
  richText: 'Metin bloğu',
  ctaBanner: 'CTA / banner',
  imageText: 'Görsel + metin',
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
  return {
    id,
    adminLabel: 'Yeni özel bölüm',
    type,
    eyebrow: '',
    title: '',
    body: '',
    image: '',
    ctaLabel: '',
    ctaLink: '/kayit',
    ctaSecondaryLabel: '',
    ctaSecondaryLink: '',
  }
}
