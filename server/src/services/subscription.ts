import { config } from '../config.js'
import { dbGet } from '../db.js'
import type { UserRow } from '../types.js'

type UserSubscription = Pick<
  UserRow,
  'role' | 'subscription_status' | 'subscription_plan' | 'subscription_expires_at'
>

export function canUserPlay(user: UserSubscription | null | undefined) {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'manager') return true
  if (!config.requireSubscription) return true
  if (user.subscription_status !== 'active') return false
  if (user.subscription_expires_at && new Date(user.subscription_expires_at) < new Date()) {
    return false
  }
  return true
}

export function isSubscriptionRequired() {
  return config.requireSubscription
}

export function getUserSubscription(userId: string) {
  return dbGet<UserSubscription>(
    'SELECT role, subscription_status, subscription_plan, subscription_expires_at FROM users WHERE id = ?',
    [userId],
  )
}
