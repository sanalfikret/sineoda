import { dbGet, dbRun } from '../db.js'
import { normalizePlanId, planExpiry } from './plans.js'

export function activateUserSubscription(userId: string, planId: string) {
  const normalizedPlanId = normalizePlanId(planId) ?? planId
  const now = new Date().toISOString()
  const user = dbGet<{ subscription_status: string; subscription_expires_at: string | null }>(
    'SELECT subscription_status, subscription_expires_at FROM users WHERE id = ?', [userId],
  )
  const currentExpiry = user?.subscription_expires_at ? new Date(user.subscription_expires_at) : null
  const base = user && ['active', 'cancelled'].includes(user.subscription_status) &&
    currentExpiry && currentExpiry.getTime() > Date.parse(now) ? currentExpiry : new Date(now)
  const expiresAt = planExpiry(normalizedPlanId, base)
  dbRun(
    'UPDATE users SET subscription_status = ?, subscription_plan = ?, subscription_started_at = ?, subscription_expires_at = ?, subscription_cancelled_at = NULL, pending_plan_id = NULL WHERE id = ?',
    ['active', normalizedPlanId, now, expiresAt, userId],
  )
  return { startedAt: now, expiresAt }
}
