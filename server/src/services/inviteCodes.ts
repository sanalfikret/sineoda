import { randomBytes, randomUUID } from 'node:crypto'
import { dbAll, dbGet, dbRun, dbTransaction, dbRunNoPersist } from '../db.js'
import { addCalendarMonths } from './calendar.js'
import { getBillingPlan, normalizeBillingPlanId } from './billingPlansConfig.js'

/** Karıştırılabilen karakterler (0/O, 1/I/L) hariç. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const MAX_BATCH = 5000

export type InviteCodeStatus = 'active' | 'used' | 'revoked'

export interface InviteCodeRow {
  id: string
  code: string
  batch_id: string
  batch_label: string
  prefix: string
  plan_id: string
  grant_months: number
  status: InviteCodeStatus
  used_by_user_id: string | null
  used_at: string | null
  expires_at: string | null
  created_at: string
}

export interface InviteBatchSummary {
  batchId: string
  label: string
  prefix: string
  planId: string
  grantMonths: number
  total: number
  used: number
  active: number
  revoked: number
  expiresAt: string | null
  createdAt: string
}

export interface InviteStats {
  total: number
  used: number
  active: number
  revoked: number
}

export function normalizeInviteCode(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function normalizePrefix(value: unknown) {
  const cleaned = String(value ?? 'PLOOY')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  return cleaned || 'PLOOY'
}

function randomSegment(length: number) {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

function buildCode(prefix: string) {
  return `${prefix}-${randomSegment(4)}-${randomSegment(4)}`
}

export function getInviteStats(): InviteStats {
  const row = dbGet<{ total: number; used: number; active: number; revoked: number }>(
    `SELECT COUNT(*) AS total,
       SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used,
       SUM(CASE WHEN status = 'active' AND (expires_at IS NULL OR expires_at > ?) THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) AS revoked
     FROM invite_codes`,
    [new Date().toISOString()],
  )
  return {
    total: row?.total ?? 0,
    used: row?.used ?? 0,
    active: row?.active ?? 0,
    revoked: row?.revoked ?? 0,
  }
}

export function listInviteBatches(): InviteBatchSummary[] {
  const rows = dbAll<{
    batch_id: string
    batch_label: string
    prefix: string
    plan_id: string
    grant_months: number
    total: number
    used: number
    active: number
    revoked: number
    expires_at: string | null
    created_at: string
  }>(
    `SELECT batch_id, MIN(batch_label) AS batch_label, MIN(prefix) AS prefix, MIN(plan_id) AS plan_id,
       MIN(grant_months) AS grant_months,
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used,
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) AS revoked,
       MIN(expires_at) AS expires_at,
       MIN(created_at) AS created_at
     FROM invite_codes
     GROUP BY batch_id
     ORDER BY MIN(created_at) DESC`,
  )
  return rows.map((row) => ({
    batchId: row.batch_id,
    label: row.batch_label,
    prefix: row.prefix,
    planId: row.plan_id,
    grantMonths: row.grant_months,
    total: row.total,
    used: row.used,
    active: row.active,
    revoked: row.revoked,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }))
}

export function listBatchCodes(batchId: string, filter: 'all' | InviteCodeStatus = 'all') {
  const rows = dbAll<InviteCodeRow & { used_by_name: string | null; used_by_email: string | null }>(
    `SELECT i.*, u.name AS used_by_name, u.email AS used_by_email
     FROM invite_codes i
     LEFT JOIN users u ON u.id = i.used_by_user_id
     WHERE i.batch_id = ? ${filter === 'all' ? '' : 'AND i.status = ?'}
     ORDER BY i.created_at, i.code`,
    filter === 'all' ? [batchId] : [batchId, filter],
  )
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    usedAt: row.used_at,
    usedByName: row.used_by_name,
    usedByEmail: row.used_by_email,
    expiresAt: row.expires_at,
  }))
}

export function createInviteBatch(input: {
  count: number
  label?: string
  prefix?: string
  planId?: string
  grantMonths?: number
  expiresAt?: string | null
}) {
  const count = Math.round(Number(input.count) || 0)
  if (count < 1 || count > MAX_BATCH) {
    throw new Error(`Kod adedi 1 ile ${MAX_BATCH} arasında olmalı.`)
  }
  const prefix = normalizePrefix(input.prefix)
  const label = String(input.label ?? '').trim().slice(0, 120) || `Davet paketi ${new Date().toLocaleDateString('tr-TR')}`
  const grantMonths = Math.max(0, Math.min(36, Math.round(Number(input.grantMonths) || 0)))
  const rawPlan = String(input.planId ?? 'standard').trim() || 'standard'
  const planId = normalizeBillingPlanId(rawPlan)
  if (!planId || !getBillingPlan(planId) || getBillingPlan(planId)?.audience === 'creator') {
    throw new Error('Geçersiz plan. Davet kodu yalnızca izleyici planlarına bağlanabilir.')
  }
  const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    throw new Error('Geçersiz son kullanma tarihi.')
  }

  const batchId = randomUUID()
  const createdAt = new Date().toISOString()
  const codes: string[] = []
  const seen = new Set<string>()

  dbTransaction(() => {
    while (codes.length < count) {
      const code = buildCode(prefix)
      if (seen.has(code)) continue
      if (dbGet('SELECT id FROM invite_codes WHERE code = ?', [code])) continue
      seen.add(code)
      dbRunNoPersist(
        `INSERT INTO invite_codes (id, code, batch_id, batch_label, prefix, plan_id, grant_months, status, used_by_user_id, used_at, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NULL, NULL, ?, ?)`,
        [randomUUID(), code, batchId, label, prefix, planId, grantMonths, expiresAt, createdAt],
      )
      codes.push(code)
    }
  })

  return { batchId, label, prefix, planId, grantMonths, expiresAt, createdAt, codes }
}

export function revokeInviteBatch(batchId: string) {
  const result = dbGet<{ total: number }>('SELECT COUNT(*) AS total FROM invite_codes WHERE batch_id = ?', [batchId])
  if (!result?.total) throw new Error('Paket bulunamadı.')
  dbRun("UPDATE invite_codes SET status = 'revoked' WHERE batch_id = ? AND status = 'active'", [batchId])
  return listInviteBatches().find((batch) => batch.batchId === batchId) ?? null
}

export function deleteInviteBatch(batchId: string) {
  const used = dbGet<{ total: number }>(
    "SELECT COUNT(*) AS total FROM invite_codes WHERE batch_id = ? AND status = 'used'",
    [batchId],
  )
  if (used?.total) throw new Error('Kullanılmış kod içeren paket silinemez; iptal edin.')
  dbRun('DELETE FROM invite_codes WHERE batch_id = ?', [batchId])
}

export function revokeInviteCode(code: string) {
  const normalized = normalizeInviteCode(code)
  const row = dbGet<InviteCodeRow>('SELECT * FROM invite_codes WHERE code = ?', [normalized])
  if (!row) throw new Error('Kod bulunamadı.')
  if (row.status === 'used') throw new Error('Kullanılmış kod iptal edilemez.')
  dbRun("UPDATE invite_codes SET status = 'revoked' WHERE id = ?", [row.id])
}

/** Kayıt öncesi kontrol: kullanılabilir davet kodu satırını döner, hata mesajı üyeye gösterilir. */
export function requireUsableInviteCode(rawCode: unknown) {
  const code = normalizeInviteCode(rawCode)
  if (!code) throw new Error('Davet kodu gerekli. Kayıt şu an yalnızca davetle yapılabiliyor.')
  const row = dbGet<InviteCodeRow>('SELECT * FROM invite_codes WHERE code = ?', [code])
  if (!row || row.status === 'revoked') throw new Error('Geçersiz davet kodu.')
  if (row.status === 'used') throw new Error('Bu davet kodu daha önce kullanılmış.')
  if (row.expires_at && new Date(row.expires_at) < new Date()) throw new Error('Bu davet kodunun süresi dolmuş.')
  return row
}

/** Kayıt tamamlanınca kodu kullanılmış işaretler ve varsa ücretsiz ayları tanımlar. */
export function consumeInviteCode(row: InviteCodeRow, userId: string) {
  const now = new Date()
  const claimed = dbGet<{ status: string }>('SELECT status FROM invite_codes WHERE id = ?', [row.id])
  if (!claimed || claimed.status !== 'active') throw new Error('Bu davet kodu az önce başka bir kayıtta kullanıldı.')
  dbRun("UPDATE invite_codes SET status = 'used', used_by_user_id = ?, used_at = ? WHERE id = ? AND status = 'active'", [
    userId,
    now.toISOString(),
    row.id,
  ])
  if (row.grant_months > 0) {
    const expiresAt = addCalendarMonths(now, row.grant_months).toISOString()
    dbRun(
      `UPDATE users SET subscription_status = 'active', subscription_plan = ?, subscription_started_at = ?, subscription_expires_at = ?, pending_plan_id = NULL WHERE id = ?`,
      [row.plan_id || 'standard', now.toISOString(), expiresAt, userId],
    )
    return { grantedMonths: row.grant_months, expiresAt }
  }
  return { grantedMonths: 0, expiresAt: null }
}
