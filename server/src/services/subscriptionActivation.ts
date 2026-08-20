import { dbRun } from '../db.js'
import { planExpiry } from './plans.js'

export function activateUserSubscription(userId: string, planId: string) {
  const now = new Date().toISOString()
  const expiresAt = planExpiry(planId)
  dbRun(
    'UPDATE users SET subscription_status = ?, subscription_plan = ?, subscription_started_at = ?, subscription_expires_at = ? WHERE id = ?',
    ['active', planId, now, expiresAt, userId],
  )
  return { startedAt: now, expiresAt }
}
