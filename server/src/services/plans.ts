import {
  getCreatorRegistrationPlanId,
  isCreatorApplicationPlanId,
  planExpiryFor,
  type BillingPlanDefinition,
} from './billingPlanDefaults.js'
import {
  getBillingPlan,
  getBillingPlans,
  getBillingPlansConfig,
  normalizeBillingPlanId,
  saveBillingPlansConfig,
  saveCustomBillingPlans,
  type CustomBillingPlanInput,
} from './billingPlansConfig.js'

export type { BillingPlanDefinition } from './billingPlanDefaults.js'
export {
  DEFAULT_BILLING_PLANS,
  getCreatorRegistrationPlanId,
  isCreatorApplicationPlanId,
  planExpiryFor,
} from './billingPlanDefaults.js'
export {
  getBillingPlans,
  getBillingPlansConfig,
  saveBillingPlansConfig,
  saveCustomBillingPlans,
  normalizeBillingPlanId,
  type CustomBillingPlanInput,
} from './billingPlansConfig.js'

export function normalizePlanId(planId: string) {
  return normalizeBillingPlanId(planId)
}

export function getPlan(planId: string) {
  return getBillingPlan(planId)
}

export function planRequiresStudentId(planId: string) {
  return Boolean(getPlan(planId)?.requiresStudentId)
}

export function planExpiry(planId: string) {
  return planExpiryFor(getPlan(planId))
}

export function isCreatorApplicationPlan(planId: string) {
  const plan = getPlan(planId)
  return plan?.audience === 'creator'
}

export function isBuiltInCreatorApplicationPlan(planId: string) {
  const normalized = normalizeBillingPlanId(planId)
  return normalized ? isCreatorApplicationPlanId(normalized as never) : false
}

export function getCreatorRegistrationPrice(program: 'standard' | 'student_cinema' = 'standard') {
  return getPlan(getCreatorRegistrationPlanId(program))?.price ?? 69
}

/** @deprecated use getBillingPlans() */
export { DEFAULT_BILLING_PLANS as BILLING_PLANS } from './billingPlanDefaults.js'
