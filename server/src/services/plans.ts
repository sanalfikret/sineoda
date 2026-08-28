export type BillingPlanId = 'standard' | 'student'

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
    features: ['Tüm içerikler', '4 profil', 'HD yayın', 'Android TV desteği'],
  },
  {
    id: 'student' as const,
    name: 'Öğrenci Plan',
    price: 49,
    currency: 'TRY',
    interval: 'month' as const,
    popular: true,
    requiresStudentId: true,
    features: ['Tüm içerikler', '4 profil', 'HD yayın', 'Geçerli öğrenci kimliği gerekir'],
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
  const expires = new Date()
  if (plan?.interval === 'year') expires.setFullYear(expires.getFullYear() + 1)
  else expires.setMonth(expires.getMonth() + 1)
  return expires.toISOString()
}
