export type BillingPlanId =
  | 'standard'
  | 'student'
  | 'creator_application'
  | 'student_cinema_application'

export type BillingPlanDefinition = {
  id: string
  name: string
  price: number
  currency: 'TRY'
  interval: 'month' | 'year' | 'once'
  audience: 'viewer' | 'creator'
  popular?: boolean
  requiresStudentId?: boolean
  enabled?: boolean
  campaignLabel?: string
  /** "Öne çıkan" işaretliyken kart üstünde görünen rozet metni (örn. Öğrencilere özel, Bayram kampanyası) */
  badgeLabel?: string
  /** Admin kartı / gruplama başlığı — tamamen özelleştirilebilir */
  sectionLabel?: string
  /** Yapımcı kayıt formu bilgi kutusu — {{price}} ve {{brand}} yer tutucuları */
  registrationNotice?: string
  features: string[]
}

export const DEFAULT_BILLING_PLANS: BillingPlanDefinition[] = [
  {
    id: 'standard',
    name: 'Standart Plan',
    price: 69,
    currency: 'TRY',
    interval: 'month',
    audience: 'viewer',
    sectionLabel: 'İzleyici aboneliği',
    enabled: true,
    features: ['Tüm içerikler', '4 profil', 'HD yayın', 'Android TV desteği'],
  },
  {
    id: 'student',
    name: 'Öğrenci Plan',
    price: 49,
    currency: 'TRY',
    interval: 'month',
    audience: 'viewer',
    sectionLabel: 'İzleyici aboneliği',
    popular: true,
    badgeLabel: 'Öğrencilere özel',
    requiresStudentId: true,
    enabled: true,
    features: ['Tüm içerikler', '4 profil', 'HD yayın', 'Geçerli öğrenci kimliği gerekir'],
  },
  {
    id: 'creator_application',
    name: 'Yapımcı Yönetmen Aylık Üyelik',
    price: 69,
    currency: 'TRY',
    interval: 'month',
    audience: 'creator',
    sectionLabel: 'Yapımcı Yönetmen',
    enabled: true,
    registrationNotice:
      'Yapımcı üyeliği aylık ₺{{price}}. Üyelik aktifken tüm filmleri izler ve film gönderirsiniz; filminizden izlenme payı kazanırsınız.',
    features: [
      'Tüm filmleri izleme (izleyici üyeliğiyle aynı)',
      'Film başvurusu gönderme',
      'İzlenme payı ile gelir',
    ],
  },
  {
    id: 'student_cinema_application',
    name: 'Genç Sinema Aylık Üyelik',
    price: 49,
    currency: 'TRY',
    interval: 'month',
    audience: 'creator',
    sectionLabel: 'Genç Sinema',
    enabled: true,
    registrationNotice:
      'Genç Sinema üyeliği aylık ₺{{price}}. Üyelik aktifken tüm filmleri izler ve film gönderirsiniz; film başvurunuz okul ve {{brand}} incelemesine alınır.',
    features: ['Tüm filmleri izleme', 'Film başvurusu gönderme', 'Okul ve admin incelemesi'],
  },
]

const PLAN_ALIASES: Record<string, BillingPlanId> = {
  monthly: 'standard',
  yearly: 'standard',
}

export function normalizePlanId(planId: string): BillingPlanId | null {
  const normalized = PLAN_ALIASES[planId] ?? planId
  return DEFAULT_BILLING_PLANS.some((plan) => plan.id === normalized)
    ? (normalized as BillingPlanId)
    : null
}

/** @deprecated use normalizeBillingPlanId from billingPlansConfig for custom plans */

export function isCreatorApplicationPlanId(planId: BillingPlanId) {
  return planId === 'creator_application' || planId === 'student_cinema_application'
}

export function getCreatorRegistrationPlanId(program: 'standard' | 'student_cinema' = 'standard') {
  return program === 'student_cinema' ? 'student_cinema_application' : 'creator_application'
}

export function planExpiryFor(plan: BillingPlanDefinition | undefined, base = new Date()) {
  if (plan?.interval === 'once') return null
  const expires = new Date(base)
  const day = expires.getUTCDate()
  // Clamp month-end dates instead of overflowing into the following month.
  expires.setUTCDate(1)
  expires.setUTCMonth(expires.getUTCMonth() + (plan?.interval === 'year' ? 12 : 1))
  const lastDay = new Date(Date.UTC(expires.getUTCFullYear(), expires.getUTCMonth() + 1, 0)).getUTCDate()
  expires.setUTCDate(Math.min(day, lastDay))
  return expires.toISOString()
}
