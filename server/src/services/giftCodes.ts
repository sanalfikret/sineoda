import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { getBillingPlan, normalizeBillingPlanId } from './billingPlansConfig.js'
import { addCalendarMonths } from './calendar.js'
import type { UserRow } from '../types.js'

export type GiftCodeKind = 'gift' | 'discount'

export type GiftCodeRow = {
  id: string
  code: string
  label: string
  kind?: string | null
  plan_id: string
  duration_months: number
  duration_years: number
  discount_percent?: number | null
  discount_amount?: number | null
  max_uses: number
  used_count: number
  expires_at: string | null
  enabled: number
  created_at: string
}

export type GiftCode = {
  id: string
  code: string
  label: string
  kind: GiftCodeKind
  /** Hediye: verilecek plan. İndirim: '' = tüm izleyici planları, yoksa tek plan. */
  planId: string
  durationMonths: number
  durationYears: number
  /** İndirim yüzdesi (1–100). 0 = yüzde yok. */
  discountPercent: number
  /** Sabit indirim, TL. 0 = sabit yok. */
  discountAmount: number
  maxUses: number
  usedCount: number
  expiresAt: string | null
  enabled: boolean
  createdAt: string
}

export type GiftCodeRedemption = {
  id: string
  userId: string
  userName: string
  userEmail: string
  redeemedAt: string
  subscriptionExpiresAt: string
  orderId: string | null
}

function mapGiftCode(row: GiftCodeRow): GiftCode {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    kind: row.kind === 'discount' ? 'discount' : 'gift',
    planId: row.plan_id ?? '',
    durationMonths: row.duration_months,
    durationYears: row.duration_years,
    discountPercent: Number(row.discount_percent ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  }
}

export function normalizeGiftCode(value: string) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function listGiftCodes() {
  const rows = dbAll<GiftCodeRow>('SELECT * FROM gift_codes ORDER BY created_at DESC')
  return rows.map(mapGiftCode)
}

export function getGiftCodeById(id: string) {
  const row = dbGet<GiftCodeRow>('SELECT * FROM gift_codes WHERE id = ?', [id])
  return row ? mapGiftCode(row) : null
}

export function listGiftCodeRedemptions(giftCodeId: string): GiftCodeRedemption[] {
  const rows = dbAll<{
    id: string
    user_id: string
    redeemed_at: string
    subscription_expires_at: string
    order_id: string | null
    name: string | null
    email: string | null
  }>(
    `SELECT r.id, r.user_id, r.redeemed_at, r.subscription_expires_at, r.order_id, u.name, u.email
     FROM gift_code_redemptions r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.gift_code_id = ?
     ORDER BY r.redeemed_at DESC`,
    [giftCodeId],
  )
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.name ?? '(silinmiş üye)',
    userEmail: row.email ?? '',
    redeemedAt: row.redeemed_at,
    subscriptionExpiresAt: row.subscription_expires_at,
    orderId: row.order_id ?? null,
  }))
}

export function createGiftCode(input: {
  code: string
  label?: string
  kind?: string
  planId?: string
  durationMonths?: number
  durationYears?: number
  discountPercent?: number
  discountAmount?: number
  maxUses?: number
  expiresAt?: string | null
}) {
  const code = normalizeGiftCode(input.code)
  if (code.length < 4 || code.length > 32) {
    throw new Error('Kupon kodu 4–32 karakter olmalı.')
  }
  if (!/^[A-Z0-9-]+$/.test(code)) {
    throw new Error('Kupon kodu yalnızca harf, rakam ve tire içerebilir.')
  }

  const existing = dbGet('SELECT id FROM gift_codes WHERE code = ?', [code])
  if (existing) {
    throw new Error('Bu kupon kodu zaten var.')
  }

  const kind: GiftCodeKind = input.kind === 'discount' ? 'discount' : 'gift'
  let durationMonths = 0
  let durationYears = 0
  let discountPercent = 0
  let discountAmount = 0
  let planId = ''

  if (kind === 'gift') {
    durationMonths = Math.max(0, Math.min(36, Math.round(Number(input.durationMonths) || 0)))
    durationYears = Math.max(0, Math.min(5, Math.round(Number(input.durationYears) || 0)))
    if (durationMonths === 0 && durationYears === 0) {
      throw new Error('Süre için en az 1 ay veya 1 yıl seçin.')
    }
    if (durationMonths > 0 && durationYears > 0) {
      throw new Error('Ay ve yıl birlikte seçilemez — yalnızca birini girin.')
    }
    const rawGiftPlan = String(input.planId ?? 'standard').trim() || 'standard'
    const normalizedGiftPlan = normalizeBillingPlanId(rawGiftPlan)
    if (!normalizedGiftPlan || !getBillingPlan(normalizedGiftPlan)) throw new Error('Geçersiz plan.')
    planId = normalizedGiftPlan
    if (getBillingPlan(planId)?.audience === 'creator') {
      throw new Error('Hediye kodu yalnızca izleyici planları için tanımlanabilir.')
    }
  } else {
    discountPercent = Math.max(0, Math.min(100, Math.round(Number(input.discountPercent) || 0)))
    discountAmount = Math.max(0, Math.min(100000, Math.round(Number(input.discountAmount) || 0)))
    if (discountPercent === 0 && discountAmount === 0) {
      throw new Error('İndirim için yüzde veya sabit TL tutarı girin.')
    }
    if (discountPercent > 0 && discountAmount > 0) {
      throw new Error('Yüzde ve sabit tutar birlikte seçilemez — yalnızca birini girin.')
    }
    const rawPlan = String(input.planId ?? '').trim()
    if (rawPlan && rawPlan !== 'all') {
      const normalized = normalizeBillingPlanId(rawPlan)
      if (!normalized) throw new Error('Geçersiz plan.')
      if (getBillingPlan(normalized)?.audience === 'creator') {
        throw new Error('İndirim kodu yalnızca izleyici planları için tanımlanabilir.')
      }
      planId = normalized
    }
  }

  const maxUses = Math.max(1, Math.min(100000, Math.round(Number(input.maxUses) || 1)))
  const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    throw new Error('Geçersiz kupon son kullanma tarihi.')
  }

  const id = uuid()
  const createdAt = new Date().toISOString()
  dbRun(
    `INSERT INTO gift_codes (
      id, code, label, kind, plan_id, duration_months, duration_years,
      discount_percent, discount_amount, max_uses, used_count, expires_at, enabled, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?)`,
    [
      id,
      code,
      String(input.label ?? '').trim().slice(0, 120),
      kind,
      planId,
      durationMonths,
      durationYears,
      discountPercent,
      discountAmount,
      maxUses,
      expiresAt,
      createdAt,
    ],
  )

  const row = dbGet<GiftCodeRow>('SELECT * FROM gift_codes WHERE id = ?', [id])
  if (!row) throw new Error('Kupon oluşturulamadı.')
  return mapGiftCode(row)
}

export function setGiftCodeEnabled(id: string, enabled: boolean) {
  const row = dbGet<GiftCodeRow>('SELECT * FROM gift_codes WHERE id = ?', [id])
  if (!row) throw new Error('Kupon bulunamadı.')
  dbRun('UPDATE gift_codes SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id])
  return mapGiftCode({ ...row, enabled: enabled ? 1 : 0 })
}

export function deleteGiftCode(id: string) {
  const row = dbGet<GiftCodeRow>('SELECT * FROM gift_codes WHERE id = ?', [id])
  if (!row) throw new Error('Kupon bulunamadı.')
  if (row.used_count > 0) {
    throw new Error('Kullanılmış kupon silinemez; bunun yerine kapatın.')
  }
  dbRun('DELETE FROM gift_code_redemptions WHERE gift_code_id = ?', [id])
  dbRun('DELETE FROM gift_codes WHERE id = ?', [id])
}

/** Kodun kullanılabilirliğini doğrular; hata mesajı üyeye gösterilir. */
function loadUsableCode(rawCode: string, userId: string) {
  const code = normalizeGiftCode(rawCode)
  if (!code) throw new Error('Kupon kodu girin.')

  const gift = dbGet<GiftCodeRow>('SELECT * FROM gift_codes WHERE code = ?', [code])
  if (!gift || gift.enabled !== 1) {
    throw new Error('Geçersiz veya devre dışı kupon kodu.')
  }
  if (gift.expires_at && new Date(gift.expires_at) < new Date()) {
    throw new Error('Bu kupon kodunun süresi dolmuş.')
  }
  if (gift.used_count >= gift.max_uses) {
    throw new Error('Bu kupon kodunun kullanım limiti dolmuş.')
  }
  const alreadyUsed = dbGet('SELECT id FROM gift_code_redemptions WHERE gift_code_id = ? AND user_id = ?', [
    gift.id,
    userId,
  ])
  if (alreadyUsed) {
    throw new Error('Bu kupon kodunu zaten kullandınız.')
  }
  return mapGiftCode(gift)
}

/** Üye kodu girdiğinde: türü ve ne sağladığını döner, tüketmez. */
export function checkGiftCode(userId: string, rawCode: string) {
  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!user) throw new Error('Kullanıcı bulunamadı.')
  if (user.role !== 'user') throw new Error('Kupon kodu yalnızca izleyici hesaplarında kullanılabilir.')
  const gift = loadUsableCode(rawCode, userId)
  return {
    kind: gift.kind,
    code: gift.code,
    label: gift.label,
    planId: gift.planId,
    durationMonths: gift.durationMonths,
    durationYears: gift.durationYears,
    discountPercent: gift.discountPercent,
    discountAmount: gift.discountAmount,
  }
}

/** İndirim kodunu bir plana uygular; kuruş cinsinden liste ve indirimli tutar döner. */
export function resolveDiscountForPlan(userId: string, rawCode: string, planId: string, listPriceTl: number) {
  const gift = loadUsableCode(rawCode, userId)
  if (gift.kind !== 'discount') {
    throw new Error('Bu bir hediye kodu; ödeme adımında değil, "Kodu kullan" ile doğrudan uygulanır.')
  }
  if (gift.planId && gift.planId !== planId) {
    const plan = getBillingPlan(gift.planId)
    throw new Error(`Bu indirim kodu yalnızca ${plan?.name ?? gift.planId} planında geçerli.`)
  }
  const listKurus = Math.round(listPriceTl * 100)
  let discountKurus = 0
  if (gift.discountPercent > 0) {
    discountKurus = Math.round((listKurus * gift.discountPercent) / 100)
  } else if (gift.discountAmount > 0) {
    discountKurus = Math.round(gift.discountAmount * 100)
  }
  discountKurus = Math.max(0, Math.min(listKurus, discountKurus))
  return {
    gift,
    listKurus,
    discountKurus,
    finalKurus: listKurus - discountKurus,
  }
}

/** Ödeme tamamlanınca (veya %100 indirimde) kod kullanımını kaydeder. Aynı sipariş iki kez sayılmaz. */
export function recordGiftCodeUse(input: {
  giftCodeId: string
  userId: string
  subscriptionExpiresAt: string | null
  orderId?: string | null
}) {
  const orderId = input.orderId ?? null
  if (orderId) {
    const existing = dbGet('SELECT id FROM gift_code_redemptions WHERE order_id = ?', [orderId])
    if (existing) return
  }
  const now = new Date().toISOString()
  dbRun('UPDATE gift_codes SET used_count = used_count + 1 WHERE id = ?', [input.giftCodeId])
  dbRun(
    'INSERT INTO gift_code_redemptions (id, gift_code_id, user_id, redeemed_at, subscription_expires_at, order_id) VALUES (?, ?, ?, ?, ?, ?)',
    [uuid(), input.giftCodeId, input.userId, now, input.subscriptionExpiresAt ?? now, orderId],
  )
}

/** Hediye kodu: ödeme olmadan üyelik süresi ekler (aktif üyelikte bitişin üstüne). */
export function redeemGiftCode(userId: string, rawCode: string) {
  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!user) {
    throw new Error('Kullanıcı bulunamadı.')
  }
  if (user.role !== 'user') {
    throw new Error('Hediye kodu yalnızca izleyici hesaplarında kullanılabilir.')
  }

  const gift = loadUsableCode(rawCode, userId)
  if (gift.kind !== 'gift') {
    throw new Error('Bu bir indirim kodu; plan seçip ödeme adımında uygulanır.')
  }

  const planId = normalizeBillingPlanId(gift.planId) ?? 'standard'
  const now = new Date()
  let base = now
  if (['active', 'cancelled'].includes(user.subscription_status ?? '') && user.subscription_expires_at) {
    const currentExpiry = new Date(user.subscription_expires_at)
    if (currentExpiry > now) base = currentExpiry
  }

  const expiresAt = addCalendarMonths(base, gift.durationYears * 12 + gift.durationMonths)
  const startedAt = user.subscription_started_at ?? now.toISOString()

  dbRun(
    `UPDATE users
     SET subscription_status = 'active',
         subscription_plan = ?,
         subscription_started_at = ?,
         subscription_expires_at = ?,
         subscription_cancelled_at = NULL,
         pending_plan_id = NULL
     WHERE id = ?`,
    [planId, startedAt, expiresAt.toISOString(), userId],
  )

  recordGiftCodeUse({ giftCodeId: gift.id, userId, subscriptionExpiresAt: expiresAt.toISOString() })

  return {
    planId,
    expiresAt: expiresAt.toISOString(),
    label: gift.label,
    code: gift.code,
  }
}
