import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { normalizeBillingPlanId } from './billingPlansConfig.js'
import type { UserRow } from '../types.js'

export type GiftCodeRow = {
  id: string
  code: string
  label: string
  plan_id: string
  duration_months: number
  duration_years: number
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
  planId: string
  durationMonths: number
  durationYears: number
  maxUses: number
  usedCount: number
  expiresAt: string | null
  enabled: boolean
  createdAt: string
}

function mapGiftCode(row: GiftCodeRow): GiftCode {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    planId: row.plan_id,
    durationMonths: row.duration_months,
    durationYears: row.duration_years,
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

function addDuration(base: Date, months: number, years: number) {
  const next = new Date(base)
  if (years > 0) next.setFullYear(next.getFullYear() + years)
  if (months > 0) next.setMonth(next.getMonth() + months)
  return next
}

export function listGiftCodes() {
  const rows = dbAll<GiftCodeRow>('SELECT * FROM gift_codes ORDER BY created_at DESC')
  return rows.map(mapGiftCode)
}

export function createGiftCode(input: {
  code: string
  label?: string
  planId?: string
  durationMonths?: number
  durationYears?: number
  maxUses?: number
  expiresAt?: string | null
}) {
  const code = normalizeGiftCode(input.code)
  if (code.length < 4 || code.length > 32) {
    throw new Error('Kupon kodu 4–32 karakter olmalı.')
  }

  const existing = dbGet('SELECT id FROM gift_codes WHERE code = ?', [code])
  if (existing) {
    throw new Error('Bu kupon kodu zaten var.')
  }

  const durationMonths = Math.max(0, Math.min(36, Math.round(Number(input.durationMonths) || 0)))
  const durationYears = Math.max(0, Math.min(5, Math.round(Number(input.durationYears) || 0)))
  if (durationMonths === 0 && durationYears === 0) {
    throw new Error('Süre için en az 1 ay veya 1 yıl seçin.')
  }
  if (durationMonths > 0 && durationYears > 0) {
    throw new Error('Ay ve yıl birlikte seçilemez — yalnızca birini girin.')
  }

  const planId = normalizeBillingPlanId(String(input.planId ?? 'standard')) ?? 'standard'
  const maxUses = Math.max(1, Math.min(100000, Math.round(Number(input.maxUses) || 1)))
  const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    throw new Error('Geçersiz kupon son kullanma tarihi.')
  }

  const id = uuid()
  const createdAt = new Date().toISOString()
  dbRun(
    `INSERT INTO gift_codes (
      id, code, label, plan_id, duration_months, duration_years,
      max_uses, used_count, expires_at, enabled, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?)`,
    [
      id,
      code,
      String(input.label ?? '').trim().slice(0, 120),
      planId,
      durationMonths,
      durationYears,
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

export function redeemGiftCode(userId: string, rawCode: string) {
  const code = normalizeGiftCode(rawCode)
  if (!code) {
    throw new Error('Kupon kodu girin.')
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!user) {
    throw new Error('Kullanıcı bulunamadı.')
  }
  if (user.role !== 'user') {
    throw new Error('Hediye kodu yalnızca izleyici hesaplarında kullanılabilir.')
  }

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

  const alreadyUsed = dbGet(
    'SELECT id FROM gift_code_redemptions WHERE gift_code_id = ? AND user_id = ?',
    [gift.id, userId],
  )
  if (alreadyUsed) {
    throw new Error('Bu kupon kodunu zaten kullandınız.')
  }

  const planId = normalizeBillingPlanId(gift.plan_id) ?? 'standard'
  const now = new Date()
  let base = now
  if (user.subscription_status === 'active' && user.subscription_expires_at) {
    const currentExpiry = new Date(user.subscription_expires_at)
    if (currentExpiry > now) base = currentExpiry
  }

  const expiresAt = addDuration(base, gift.duration_months, gift.duration_years)
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

  dbRun('UPDATE gift_codes SET used_count = used_count + 1 WHERE id = ?', [gift.id])
  dbRun(
    'INSERT INTO gift_code_redemptions (id, gift_code_id, user_id, redeemed_at, subscription_expires_at) VALUES (?, ?, ?, ?, ?)',
    [uuid(), gift.id, userId, now.toISOString(), expiresAt.toISOString()],
  )

  return {
    planId,
    expiresAt: expiresAt.toISOString(),
    label: gift.label,
    code: gift.code,
  }
}
