export type BillingPlanId =
  | 'standard'
  | 'student'
  | 'creator_application'
  | 'student_cinema_application'

export type BillingPlanDefinition = {
  id: BillingPlanId
  name: string
  price: number
  currency: 'TRY'
  interval: 'month' | 'year' | 'once'
  audience: 'viewer' | 'creator'
  popular?: boolean
  requiresStudentId?: boolean
  enabled?: boolean
  campaignLabel?: string
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
    requiresStudentId: true,
    enabled: true,
    features: ['Tüm içerikler', '4 profil', 'HD yayın', 'Geçerli öğrenci kimliği gerekir'],
  },
  {
    id: 'creator_application',
    name: 'Yapımcı Yönetmen Başvuru Ücreti + Üyelik',
    price: 69,
    currency: 'TRY',
    interval: 'once',
    audience: 'creator',
    sectionLabel: 'Yapımcı Yönetmen',
    enabled: true,
    registrationNotice:
      'Kayıt sonrası ₺{{price}} yapımcı başvuru ücreti ödenir. Üyeliğiniz otomatik onaylanır; filminizin yayına alınması admin incelemesine tabidir.',
    features: [
      'Yapımcı Yönetmen paneli erişimi',
      'Film başvurusu gönderme',
      'Gelir paylaşımı modeli',
    ],
  },
  {
    id: 'student_cinema_application',
    name: 'Genç Sinema Başvuru Ücreti + Üyelik',
    price: 49,
    currency: 'TRY',
    interval: 'once',
    audience: 'creator',
    sectionLabel: 'Genç Sinema',
    enabled: true,
    registrationNotice:
      'Kayıt sonrası ₺{{price}} Genç Sinema başvuru ücreti ödenir. Üyeliğiniz otomatik açılır; filminiz okul ve {{brand}} incelemesine alınır.',
    features: ['Genç Sinema paneli erişimi', 'Film başvurusu gönderme', 'Okul ve admin incelemesi'],
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

export function planExpiryFor(plan: BillingPlanDefinition | undefined) {
  if (plan?.interval === 'once') return null
  const expires = new Date()
  if (plan?.interval === 'year') expires.setFullYear(expires.getFullYear() + 1)
  else expires.setMonth(expires.getMonth() + 1)
  return expires.toISOString()
}
