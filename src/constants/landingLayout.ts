export type BuiltInLandingBlockId =
  | 'hero'
  | 'manifesto'
  | 'slider'
  | 'studentMonthlyWinners'
  | 'studentPicks'
  | 'showcases'
  | 'journal'
  | 'features'
  | 'campaign'
  | 'studentCinema'
  | 'faq'
  | 'emailSignup'
  | 'creator'

/** Yerleşik veya özel (custom:uuid) bölüm kimliği */
export type LandingLayoutBlockId = BuiltInLandingBlockId | `custom:${string}`

/** @deprecated Yerleşik bloklar için alias */
export type LandingBlockId = BuiltInLandingBlockId

export interface LandingLayoutConfig {
  order: LandingLayoutBlockId[]
  hidden: LandingLayoutBlockId[]
}

export const ALL_LANDING_BLOCK_IDS: BuiltInLandingBlockId[] = [
  'hero',
  'manifesto',
  'slider',
  'studentMonthlyWinners',
  'studentPicks',
  'showcases',
  'journal',
  'features',
  'campaign',
  'studentCinema',
  'faq',
  'emailSignup',
  'creator',
]

export const DEFAULT_LANDING_BLOCK_ORDER: BuiltInLandingBlockId[] = [...ALL_LANDING_BLOCK_IDS]

export const LANDING_BLOCK_LABELS: Record<BuiltInLandingBlockId, string> = {
  hero: 'Hero (üst bölüm)',
  manifesto: 'Manifesto',
  slider: 'Fragman slider',
  studentMonthlyWinners: 'Ayın Genç Sinema birincileri',
  studentPicks: 'Genç Sinema seçkisi',
  showcases: 'Kategori şeritleri',
  journal: 'Dergi',
  features: 'Neden Sineoda',
  campaign: 'Kampanya / Abonelik',
  studentCinema: 'Genç Sinema bölümü',
  faq: 'SSS',
  emailSignup: 'E-posta kayıt',
  creator: 'Yapımcılar',
}

export const LANDING_BLOCK_HINTS: Partial<Record<BuiltInLandingBlockId, string>> = {
  hero: 'Başlık, arka plan ve öne çıkan kutu',
  manifesto: 'Üst metin bloğu',
  slider: 'Fragman ve poster satırı',
  studentMonthlyWinners: 'Admin seçimi ay birincileri — rozet ve ödül',
  studentPicks: 'Onaylı genç sinema içerikleri — otomatik listelenir',
  showcases: 'Dizi, film, belgesel sekmeleri',
  journal: 'Dergi başlığı',
  features: 'Özellik kartları',
  campaign: 'Fiyat kartı ve kampanya görseli',
  studentCinema: 'Başvuru adımları',
  faq: 'Sık sorulan sorular',
  emailSignup: 'Bülten kayıt formu',
  creator: 'Yapımcı başvuru bölümü',
}

export type LandingContentBlockId = Exclude<
  BuiltInLandingBlockId,
  'hero' | 'slider' | 'studentMonthlyWinners' | 'studentPicks' | 'showcases'
>

export { CUSTOM_BLOCK_PREFIX, isCustomLandingBlockId, parseCustomBlockId } from './landingCustomBlocks'

import { CUSTOM_BLOCK_PREFIX, isCustomLandingBlockId } from './landingCustomBlocks'

function isBuiltInBlockId(id: string): id is BuiltInLandingBlockId {
  return ALL_LANDING_BLOCK_IDS.includes(id as BuiltInLandingBlockId)
}

function isKnownLayoutBlockId(id: string, customBlockIds: string[]) {
  if (isBuiltInBlockId(id)) return true
  if (!isCustomLandingBlockId(id)) return false
  const blockId = id.slice(CUSTOM_BLOCK_PREFIX.length)
  return customBlockIds.includes(blockId)
}

export function normalizeLandingLayout(
  raw?: { order?: string[]; hidden?: string[] } | LandingLayoutConfig | null,
  customBlockIds: string[] = [],
): LandingLayoutConfig {
  const orderInput = Array.isArray(raw?.order) ? raw.order : []
  const order: LandingLayoutBlockId[] = []

  for (const id of orderInput) {
    if (isKnownLayoutBlockId(id, customBlockIds) && !order.includes(id as LandingLayoutBlockId)) {
      order.push(id as LandingLayoutBlockId)
    }
  }

  for (const id of DEFAULT_LANDING_BLOCK_ORDER) {
    if (!order.includes(id)) order.push(id)
  }

  const hiddenInput = Array.isArray(raw?.hidden) ? raw.hidden : []
  const hidden = hiddenInput.filter(
    (id): id is LandingLayoutBlockId =>
      isKnownLayoutBlockId(id, customBlockIds) && !hidden.includes(id as LandingLayoutBlockId),
  )

  return { order, hidden }
}

export function getLayoutBlockLabel(
  id: LandingLayoutBlockId,
  customBlocks: Array<{ id: string; adminLabel: string }>,
): string {
  if (isBuiltInBlockId(id)) return LANDING_BLOCK_LABELS[id]
  if (isCustomLandingBlockId(id)) {
    const blockId = id.slice(CUSTOM_BLOCK_PREFIX.length)
    return customBlocks.find((block) => block.id === blockId)?.adminLabel ?? 'Özel bölüm'
  }
  return 'Bölüm'
}
