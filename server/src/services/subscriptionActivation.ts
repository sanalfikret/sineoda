import { dbRun } from '../db.js'
import { normalizePlanId, planExpiry } from './plans.js'

export function activateUserSubscription(userId: string, planId: string) {
  const normalizedPlanId = normalizePlanId(planId) ?? planId
  const now = new Date().toISOString()
  const expiresAt = planExpiry(normalizedPlanId)
  dbRun(
    'UPDATE users SET subscription_status = ?, subscription_plan = ?, subscription_started_at = ?, subscription_expires_at = ?, pending_plan_id = NULL WHERE id = ?',
    ['active', normalizedPlanId, now, expiresAt, userId],
  )
  return { startedAt: now, expiresAt }
}
