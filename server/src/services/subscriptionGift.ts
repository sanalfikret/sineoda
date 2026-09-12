import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import type { UserRow } from '../types.js'
import { addCalendarMonths } from './calendar.js'
import { getCreatorRegistrationPlanId } from './billingPlanDefaults.js'
import { promotePaymentPendingFilms } from './creatorRegistration.js'
import { sendMessageToUser } from './userMessages.js'

export const GIFT_MIN_MONTHS = 1
export const GIFT_MAX_MONTHS = 36

export type GiftAudience =
  | 'viewers_all'
  | 'viewers_active'
  | 'viewers_expired'
  | 'creators_all'
  | 'creators_standard'
  | 'creators_student'

export const GIFT_AUDIENCES: GiftAudience[] = [
  'viewers_all',
  'viewers_active',
  'viewers_expired',
  'creators_all',
  'creators_standard',
  'creators_student',
]

export interface GiftResult {
  userId: string
  months: number
  expiresAt: string
  plan: string
  role: string
}

function isActiveNow(user: Pick<UserRow, 'subscription_status' | 'subscription_expires_at'>) {
  if (!['active', 'cancelled'].includes(user.subscription_status ?? '')) return false
  if (!user.subscription_expires_at) return true
  return new Date(user.subscription_expires_at) > new Date()
}

function formatTr(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Bir üyeye (izleyici veya yapımcı) N ay üyelik ekler.
 * Aktif üyelikte bitişin üstüne eklenir; süresi dolmuşsa bugünden başlar.
 * Yapımcıda üyelik = izleme + film gönderme hakkı; ödeme bekleyen filmler incelemeye alınır.
 */
export function giftSubscriptionMonths(
  userId: string,
  months: number,
  options: { grantedBy?: string | null; note?: string; notify?: boolean } = {},
): GiftResult {
  if (!Number.isInteger(months) || months < GIFT_MIN_MONTHS || months > GIFT_MAX_MONTHS) {
    throw new Error(`Hediye süresi ${GIFT_MIN_MONTHS}–${GIFT_MAX_MONTHS} ay arasında olmalı.`)
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!user) {
    throw new Error('Kullanıcı bulunamadı.')
  }
  if (user.role !== 'user' && user.role !== 'creator') {
    throw new Error('Hediye üyelik yalnızca izleyici ve yapımcı hesaplarına verilebilir.')
  }

  const now = new Date()
  let base = now
  if (isActiveNow(user) && user.subscription_expires_at) {
    const expires = new Date(user.subscription_expires_at)
    if (expires > now) base = expires
  }
  const newExpiry = addCalendarMonths(base, months).toISOString()
  const startedAt = user.subscription_started_at ?? now.toISOString()

  let plan = user.subscription_plan ?? 'standard'
  if (user.role === 'creator') {
    const creator = dbGet<{ id: string; program: string | null }>('SELECT id, program FROM creators WHERE user_id = ?', [userId])
    plan = getCreatorRegistrationPlanId((creator?.program ?? 'standard') as 'standard' | 'student_cinema')
    dbRun('UPDATE creators SET registration_paid_at = COALESCE(registration_paid_at, ?), pending_film_link = NULL WHERE user_id = ?', [
      now.toISOString(),
      userId,
    ])
    if (creator) promotePaymentPendingFilms(creator.id)
  }

  dbRun(
    `UPDATE users
     SET subscription_status = 'active',
         subscription_plan = ?,
         subscription_started_at = ?,
         subscription_expires_at = ?,
         subscription_cancelled_at = NULL,
         pending_plan_id = NULL
     WHERE id = ?`,
    [plan, startedAt, newExpiry, userId],
  )

  dbRun(
    'INSERT INTO subscription_gifts (id, user_id, months, granted_by, note, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuid(), userId, months, options.grantedBy ?? null, String(options.note ?? '').trim().slice(0, 200), newExpiry, now.toISOString()],
  )

  if (options.notify !== false) {
    try {
      sendMessageToUser({
        userId,
        subject: `Üyeliğiniz ${months} ay uzatıldı`,
        body:
          user.role === 'creator'
            ? `Plooy yapımcı üyeliğinize ${months} ay hediye eklendi. Yeni bitiş tarihi: ${formatTr(newExpiry)}. Bu süre boyunca film izleyebilir ve film gönderebilirsiniz.`
            : `Plooy üyeliğinize ${months} ay hediye eklendi. Yeni bitiş tarihi: ${formatTr(newExpiry)}. İyi seyirler!`,
        sentByAdminId: options.grantedBy ?? 'system',
      })
    } catch {
      /* bildirim başarısız olsa da hediye geçerli */
    }
  }

  return { userId, months, expiresAt: newExpiry, plan, role: user.role }
}

export function resolveGiftAudienceUserIds(audience: GiftAudience): string[] {
  const nowIso = new Date().toISOString()
  switch (audience) {
    case 'viewers_all':
      return dbAll<{ id: string }>("SELECT id FROM users WHERE role = 'user'").map((r) => r.id)
    case 'viewers_active':
      return dbAll<{ id: string }>(
        "SELECT id FROM users WHERE role = 'user' AND subscription_status IN ('active','cancelled') AND (subscription_expires_at IS NULL OR subscription_expires_at > ?)",
        [nowIso],
      ).map((r) => r.id)
    case 'viewers_expired':
      return dbAll<{ id: string }>(
        "SELECT id FROM users WHERE role = 'user' AND (subscription_status NOT IN ('active','cancelled') OR subscription_status IS NULL OR (subscription_expires_at IS NOT NULL AND subscription_expires_at <= ?))",
        [nowIso],
      ).map((r) => r.id)
    case 'creators_all':
      return dbAll<{ user_id: string }>("SELECT c.user_id FROM creators c JOIN users u ON u.id = c.user_id WHERE u.role = 'creator'").map((r) => r.user_id)
    case 'creators_standard':
      return dbAll<{ user_id: string }>(
        "SELECT c.user_id FROM creators c JOIN users u ON u.id = c.user_id WHERE u.role = 'creator' AND COALESCE(c.program, 'standard') = 'standard'",
      ).map((r) => r.user_id)
    case 'creators_student':
      return dbAll<{ user_id: string }>(
        "SELECT c.user_id FROM creators c JOIN users u ON u.id = c.user_id WHERE u.role = 'creator' AND c.program = 'student_cinema'",
      ).map((r) => r.user_id)
    default:
      return []
  }
}

export function giftSubscriptionBulk(input: {
  months: number
  audience?: GiftAudience
  userIds?: string[]
  grantedBy?: string | null
  note?: string
}) {
  const ids = new Set<string>()
  if (input.audience) for (const id of resolveGiftAudienceUserIds(input.audience)) ids.add(id)
  if (input.userIds) for (const id of input.userIds) if (typeof id === 'string' && id.trim()) ids.add(id.trim())
  if (ids.size === 0) throw new Error('Uzatılacak üye bulunamadı.')
  if (ids.size > 20000) throw new Error('Tek seferde en fazla 20.000 üye uzatılabilir.')

  let granted = 0
  const skipped: Array<{ userId: string; reason: string }> = []
  for (const userId of ids) {
    try {
      giftSubscriptionMonths(userId, input.months, { grantedBy: input.grantedBy, note: input.note, notify: true })
      granted += 1
    } catch (err) {
      skipped.push({ userId, reason: err instanceof Error ? err.message : 'Uzatılamadı.' })
    }
  }
  return { granted, skipped, total: ids.size }
}

export function listGiftHistory(userId: string) {
  return dbAll<{ id: string; months: number; granted_by: string | null; note: string; expires_at: string; created_at: string; admin_name: string | null }>(
    `SELECT g.id, g.months, g.granted_by, g.note, g.expires_at, g.created_at, a.name AS admin_name
     FROM subscription_gifts g LEFT JOIN users a ON a.id = g.granted_by
     WHERE g.user_id = ? ORDER BY g.created_at DESC LIMIT 50`,
    [userId],
  ).map((row) => ({
    id: row.id,
    months: row.months,
    grantedBy: row.admin_name ?? row.granted_by,
    note: row.note,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }))
}
