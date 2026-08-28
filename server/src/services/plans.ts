import {
  getCreatorRegistrationPlanId,
  isCreatorApplicationPlanId,
  normalizePlanId,
  planExpiryFor,
  type BillingPlanId,
} from './billingPlanDefaults.js'
import { getBillingPlan, getBillingPlans } from './billingPlansConfig.js'

export type { BillingPlanId, BillingPlanDefinition } from './billingPlanDefaults.js'
export { DEFAULT_BILLING_PLANS, getCreatorRegistrationPlanId } from './billingPlanDefaults.js'
export { getBillingPlans, getBillingPlansConfig, saveBillingPlansConfig } from './billingPlansConfig.js'

export function getPlan(planId: string) {
  const normalized = normalizePlanId(planId)
  if (!normalized) return undefined
  return getBillingPlan(normalized)
}

export function planRequiresStudentId(planId: string) {
  return Boolean(getPlan(planId)?.requiresStudentId)
}

export function planExpiry(planId: string) {
  return planExpiryFor(getPlan(planId))
}

export function isCreatorApplicationPlan(planId: string) {
  const normalized = normalizePlanId(planId)
  return normalized ? isCreatorApplicationPlanId(normalized) : false
}

export function getCreatorRegistrationPrice(program: 'standard' | 'student_cinema' = 'standard') {
  return getPlan(getCreatorRegistrationPlanId(program))?.price ?? 69
}

/** @deprecated use getBillingPlans() */
export { DEFAULT_BILLING_PLANS as BILLING_PLANS } from './billingPlanDefaults.js'
