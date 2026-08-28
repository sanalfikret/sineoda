import { dbGet, dbRun } from '../db.js'
import type { UserRow } from '../types.js'

export function giftSubscriptionMonths(userId: string, months: number) {
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    throw new Error('Hediye süresi 1–24 ay arasında olmalı.')
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!user) {
    throw new Error('Kullanıcı bulunamadı.')
  }
  if (user.role !== 'user') {
    throw new Error('Hediye abonelik yalnızca izleyici hesaplarına verilebilir.')
  }

  const now = new Date()
  let base = now
  if (user.subscription_status === 'active' && user.subscription_expires_at) {
    const expires = new Date(user.subscription_expires_at)
    if (expires > now) base = expires
  }

  const newExpiry = new Date(base)
  newExpiry.setMonth(newExpiry.getMonth() + months)

  const startedAt = user.subscription_started_at ?? now.toISOString()
  dbRun(
    `UPDATE users
     SET subscription_status = 'active',
         subscription_plan = COALESCE(subscription_plan, 'standard'),
         subscription_started_at = ?,
         subscription_expires_at = ?
     WHERE id = ?`,
    [startedAt, newExpiry.toISOString(), userId],
  )

  return {
    months,
    expiresAt: newExpiry.toISOString(),
    plan: user.subscription_plan ?? 'standard',
  }
}
