import type { User } from '../types/auth'

export function hasActiveSubscription(user: User) {
  if (user.role === 'admin' || user.role === 'manager') return true
  const sub = user.subscription
  if (sub?.status !== 'active') return false
  if (!sub.expiresAt) return true
  return new Date(sub.expiresAt) > new Date()
}

export function needsSubscriptionPayment(user: User) {
  return user.role === 'user' && !hasActiveSubscription(user)
}

export function postLoginPath(user: User) {
  if (user.role !== 'user') return '/profiller'
  if (hasActiveSubscription(user)) return '/profiller'
  const plan = user.pendingPlanId ?? 'standard'
  return `/planlar?plan=${encodeURIComponent(plan)}&checkout=1`
}

export function subscriptionCheckoutPath(user: User) {
  const plan = user.pendingPlanId ?? 'standard'
  return `/planlar?plan=${encodeURIComponent(plan)}&checkout=1`
}

export function planDisplayName(planId: string | null | undefined) {
  if (planId === 'student') return 'Öğrenci Plan'
  if (planId === 'standard') return 'Standart Plan'
  if (planId === 'creator_application') return 'Yapımcı Başvuru Ücreti'
  if (planId === 'monthly') return 'Standart Plan'
  if (planId === 'yearly') return 'Yıllık Plan'
  return planId ?? '—'
}

export function creatorCheckoutPath() {
  return '/creator/odeme?checkout=1'
}
