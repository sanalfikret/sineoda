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
    popular: true,
    requiresStudentId: true,
    enabled: true,
    features: ['Tüm içerikler', '4 profil', 'HD yayın', 'Geçerli öğrenci kimliği gerekir'],
  },
  {
    id: 'creator_application',
    name: 'Yapımcı Başvuru Ücreti',
    price: 69,
    currency: 'TRY',
    interval: 'once',
    audience: 'creator',
    enabled: true,
    features: ['Yapımcı paneli erişimi', 'Film başvurusu gönderme', 'Gelir paylaşımı modeli'],
  },
  {
    id: 'student_cinema_application',
    name: 'Genç Sinema Başvuru Ücreti',
    price: 49,
    currency: 'TRY',
    interval: 'once',
    audience: 'creator',
    enabled: true,
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
