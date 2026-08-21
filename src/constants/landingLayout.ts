export type LandingBlockId =
  | 'hero'
  | 'manifesto'
  | 'slider'
  | 'studentPicks'
  | 'showcases'
  | 'journal'
  | 'features'
  | 'campaign'
  | 'studentCinema'
  | 'faq'
  | 'emailSignup'
  | 'creator'

export interface LandingLayoutConfig {
  order: LandingBlockId[]
  hidden: LandingBlockId[]
}

export const ALL_LANDING_BLOCK_IDS: LandingBlockId[] = [
  'hero',
  'manifesto',
  'slider',
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

export const DEFAULT_LANDING_BLOCK_ORDER: LandingBlockId[] = [...ALL_LANDING_BLOCK_IDS]

export const LANDING_BLOCK_LABELS: Record<LandingBlockId, string> = {
  hero: 'Hero (üst bölüm)',
  manifesto: 'Manifesto',
  slider: 'Fragman slider',
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

export const LANDING_BLOCK_HINTS: Partial<Record<LandingBlockId, string>> = {
  hero: 'Başlık, arka plan ve öne çıkan kutu',
  manifesto: 'Üst metin bloğu',
  slider: 'Fragman ve poster satırı',
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
  LandingBlockId,
  'hero' | 'slider' | 'studentPicks' | 'showcases'
>

export function normalizeLandingLayout(
  raw?: { order?: string[]; hidden?: string[] } | LandingLayoutConfig | null,
): LandingLayoutConfig {
  const orderInput = Array.isArray(raw?.order) ? raw.order : []
  const order: LandingBlockId[] = []

  for (const id of orderInput) {
    if (ALL_LANDING_BLOCK_IDS.includes(id as LandingBlockId) && !order.includes(id as LandingBlockId)) {
      order.push(id as LandingBlockId)
    }
  }

  for (const id of DEFAULT_LANDING_BLOCK_ORDER) {
    if (!order.includes(id)) order.push(id)
  }

  const hiddenInput = Array.isArray(raw?.hidden) ? raw.hidden : []
  const hidden = hiddenInput.filter(
    (id): id is LandingBlockId =>
      ALL_LANDING_BLOCK_IDS.includes(id as LandingBlockId) && !hidden.includes(id as LandingBlockId),
  )

  return { order, hidden }
}
