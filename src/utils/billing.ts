import type { User } from '../types/auth'

function hasActiveSubscription(user: User) {
  const sub = user.subscription
  if (sub?.status !== 'active') return false
  if (!sub.expiresAt) return true
  return new Date(sub.expiresAt) > new Date()
}

export function postLoginPath(user: User) {
  if (user.role !== 'user') return '/profiller'
  if (hasActiveSubscription(user)) return '/profiller'
  const plan = user.pendingPlanId ?? 'standard'
  return `/planlar?plan=${encodeURIComponent(plan)}&checkout=1`
}

export function planDisplayName(planId: string | null | undefined) {
  if (planId === 'student') return 'Öğrenci Plan'
  if (planId === 'standard') return 'Standart Plan'
  if (planId === 'monthly') return 'Standart Plan'
  if (planId === 'yearly') return 'Yıllık Plan'
  return planId ?? '—'
}
