import { dbGet, dbRun } from '../db.js'
import type { UserRow } from '../types.js'

export function cancelUserSubscription(userId: string) {
  const user = dbGet<Pick<UserRow, 'role' | 'subscription_status' | 'subscription_expires_at'>>(
    'SELECT role, subscription_status, subscription_expires_at FROM users WHERE id = ?',
    [userId],
  )

  if (!user) {
    throw new Error('Kullanıcı bulunamadı.')
  }
  if (user.role === 'creator') {
    throw new Error('Yapımcı hesaplarında abonelik iptali geçerli değil.')
  }
  if (user.subscription_status !== 'active') {
    throw new Error('Yalnızca aktif abonelik iptal edilebilir.')
  }

  const now = new Date().toISOString()
  dbRun(
    'UPDATE users SET subscription_status = ?, subscription_cancelled_at = ? WHERE id = ?',
    ['cancelled', now, userId],
  )

  return {
    status: 'cancelled' as const,
    cancelledAt: now,
    expiresAt: user.subscription_expires_at ?? null,
  }
}
