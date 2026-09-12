/** Canlı plan adları — fetchBillingPlans her çağrıda doldurur; planDisplayName buradan okur. */
const names = new Map<string, string>()

export function registerPlanNames(plans: Array<{ id: string; name: string }>) {
  for (const plan of plans) names.set(plan.id, plan.name)
}

export function getCachedPlanName(planId: string) {
  return names.get(planId) ?? null
}
