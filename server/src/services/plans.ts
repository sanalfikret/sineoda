export type BillingPlanId =
  | 'standard'
  | 'student'
  | 'creator_application'
  | 'student_cinema_application'

const PLAN_ALIASES: Record<string, BillingPlanId> = {
  monthly: 'standard',
  yearly: 'standard',
}

export const BILLING_PLANS = [
  {
    id: 'standard' as const,
    name: 'Standart Plan',
    price: 69,
    currency: 'TRY',
    interval: 'month' as const,
    audience: 'viewer' as const,
    features: ['Tüm içerikler', '4 profil', 'HD yayın', 'Android TV desteği'],
  },
  {
    id: 'student' as const,
    name: 'Öğrenci Plan',
    price: 49,
    currency: 'TRY',
    interval: 'month' as const,
    audience: 'viewer' as const,
    popular: true,
    requiresStudentId: true,
    features: ['Tüm içerikler', '4 profil', 'HD yayın', 'Geçerli öğrenci kimliği gerekir'],
  },
  {
    id: 'creator_application' as const,
    name: 'Yapımcı Başvuru Ücreti',
    price: 69,
    currency: 'TRY',
    interval: 'once' as const,
    audience: 'creator' as const,
    features: ['Yapımcı paneli erişimi', 'Film başvurusu gönderme', 'Gelir paylaşımı modeli'],
  },
  {
    id: 'student_cinema_application' as const,
    name: 'Genç Sinema Başvuru Ücreti',
    price: 49,
    currency: 'TRY',
    interval: 'once' as const,
    audience: 'creator' as const,
    features: ['Genç Sinema paneli erişimi', 'Film başvurusu gönderme', 'Okul ve admin incelemesi'],
  },
]

export function normalizePlanId(planId: string): BillingPlanId | null {
  const normalized = PLAN_ALIASES[planId] ?? planId
  return BILLING_PLANS.some((plan) => plan.id === normalized) ? (normalized as BillingPlanId) : null
}

export function getPlan(planId: string) {
  const normalized = normalizePlanId(planId)
  if (!normalized) return undefined
  return BILLING_PLANS.find((plan) => plan.id === normalized)
}

export function planRequiresStudentId(planId: string) {
  return Boolean(getPlan(planId)?.requiresStudentId)
}

export function planExpiry(planId: string) {
  const plan = getPlan(planId)
  if (plan?.interval === 'once') return null
  const expires = new Date()
  if (plan?.interval === 'year') expires.setFullYear(expires.getFullYear() + 1)
  else expires.setMonth(expires.getMonth() + 1)
  return expires.toISOString()
}

export function isCreatorApplicationPlan(planId: string) {
  const normalized = normalizePlanId(planId)
  return normalized === 'creator_application' || normalized === 'student_cinema_application'
}

export function getCreatorRegistrationPlanId(program: 'standard' | 'student_cinema' = 'standard') {
  return program === 'student_cinema' ? 'student_cinema_application' : 'creator_application'
}

export function getCreatorRegistrationPrice(program: 'standard' | 'student_cinema' = 'standard') {
  return getPlan(getCreatorRegistrationPlanId(program))?.price ?? 69
}
