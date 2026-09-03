import type { BillingPlan } from '../api/client'

export const CREATOR_REGISTRATION_PLAN_IDS = {
  standard: 'creator_application',
  student_cinema: 'student_cinema_application',
} as const

export function getCreatorRegistrationPlanId(program: 'standard' | 'student_cinema' = 'standard') {
  return program === 'student_cinema'
    ? CREATOR_REGISTRATION_PLAN_IDS.student_cinema
    : CREATOR_REGISTRATION_PLAN_IDS.standard
}

export function findCreatorRegistrationPlan(
  plans: BillingPlan[],
  program: 'standard' | 'student_cinema' = 'standard',
) {
  return plans.find((plan) => plan.id === getCreatorRegistrationPlanId(program)) ?? null
}

export function formatPlanRegistrationNotice(
  template: string | undefined,
  options: { price: number; brand?: string },
  fallback: string,
) {
  const source = template?.trim() || fallback
  return source
    .replace(/\{\{price\}\}/g, String(options.price))
    .replace(/\{\{brand\}\}/g, options.brand ?? 'Plooy')
}
