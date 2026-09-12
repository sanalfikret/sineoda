import type { User } from '../types/auth'
import { planDisplayName } from '../i18n/helpers'

export { planDisplayName }

export function hasActiveSubscription(user: User) {
  if (user.role === 'admin' || user.role === 'manager') return true
  const sub = user.subscription
  if (sub?.status !== 'active') return false
  if (!sub.expiresAt) return true
  return new Date(sub.expiresAt) > new Date()
}

export function needsSubscriptionPayment(user: User) {
  return (user.role === 'user' || user.role === 'creator') && !hasActiveSubscription(user)
}

export function postLoginPath(user: User) {
  if (user.role === 'creator') return '/creator'
  if (user.role !== 'user') return '/profiller'
  if (hasActiveSubscription(user)) return '/profiller'
  const plan = user.pendingPlanId ?? 'standard'
  return `/planlar?plan=${encodeURIComponent(plan)}&checkout=1`
}

export function subscriptionCheckoutPath(user: User) {
  if (user.role === 'creator') return creatorCheckoutPath()
  const plan = user.pendingPlanId ?? 'standard'
  return `/planlar?plan=${encodeURIComponent(plan)}&checkout=1`
}

export function creatorCheckoutPath() {
  return '/creator/odeme?checkout=1'
}
