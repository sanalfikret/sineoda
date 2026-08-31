import { normalizeContentType } from '../constants/contentTypes.js'
import { BRAND_NAME } from '../constants/brand.js'
import { dbAll, dbGet, dbRun } from '../db.js'
import { getWatchThreshold } from './watchQualification.js'
import { getMonthlyReport } from './watchAccounting.js'

export type PaymentHalf = 'H1' | 'H2'
export type PaymentPool = 'short' | 'student' | 'documentary' | 'long'
export type SettlementStatus = 'open' | 'confirmed' | 'paid'

/** Giderler sonrası dağıtılabilir kardan pay oranları (toplam %100). */
export const REVENUE_POOL_RATES: Record<PaymentPool | 'plooy', number> = {
  plooy: 0.5,
  short: 0.05,
  student: 0.05,
  documentary: 0.1,
  long: 0.3,
}

export const POOL_RATE_PERCENT: Record<PaymentPool | 'plooy', number> = {
  plooy: 50,
  short: 5,
  student: 5,
  documentary: 10,
  long: 30,
}

const POOL_LABELS: Record<PaymentPool, string> = {
  short: 'Kısa film',
  student: 'Genç Sinema',
  documentary: 'Belgesel & dikey',
  long: 'Uzun metraj',
}

export interface SettlementPoolSummary {
  pool: PaymentPool | 'plooy'
  label: string
  ratePercent: number
  effectiveRatePercent: number
  qualifiedMinutes: number
  contentCount: number
}

export interface SettlementContentItem {
  contentId: string
  title: string
  type: string
  program: 'standard' | 'student_cinema'
  pool: PaymentPool
  poolLabel: string
  poolRatePercent: number
  creatorId: string | null
  creatorName: string | null
  studioName: string | null
  qualifiedMinutes: number
  watchMinutes: number
  viewerCount: number
  avgCompletionPercent: number
  qualifiedViewerPercent: number
  poolSharePercent: number
  profitSharePercent: number
}

export interface SettlementCreatorItem {
  creatorId: string
  creatorName: string | null
  studioName: string | null
  qualifiedMinutes: number
  profitSharePercent: number
  contentCount: number
}

export interface SettlementReport {
  periodId: string
  label: string
  months: string[]
  status: SettlementStatus
  isEditable: boolean
  totalQualifiedMinutes: number
  totalWatchMinutes: number
  poolSummaries: SettlementPoolSummary[]
  totalCreatorSharePercent: number
  items: SettlementContentItem[]
  creators: SettlementCreatorItem[]
  confirmedAt: string | null
  paidAt: string | null
}

export function parsePaymentPeriodId(periodId: string) {
  const match = periodId.match(/^(\d{4})-(H1|H2)$/)
  if (!match) throw new Error('Geçersiz ödeme dönemi.')
  return { year: Number(match[1]), half: match[2] as PaymentHalf }
}

export function currentPaymentPeriodId(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return month <= 6 ? `${year}-H1` : `${year}-H2`
}

export function paymentPeriodMonths(periodId: string) {
  const { year, half } = parsePaymentPeriodId(periodId)
  const y = String(year)
  if (half === 'H1') {
    return [`${y}-01`, `${y}-02`, `${y}-03`, `${y}-04`, `${y}-05`, `${y}-06`]
  }
  return [`${y}-07`, `${y}-08`, `${y}-09`, `${y}-10`, `${y}-11`, `${y}-12`]
}

export function paymentPeriodLabel(periodId: string) {
  const { year, half } = parsePaymentPeriodId(periodId)
  return half === 'H1' ? `${year} Ocak – Haziran` : `${year} Temmuz – Aralık`
}

export function paymentPeriodDateRange(periodId: string) {
  const { year, half } = parsePaymentPeriodId(periodId)
  if (half === 'H1') {
    return { start: `${year}-01-01`, endExclusive: `${year}-07-01` }
  }
  return { start: `${year}-07-01`, endExclusive: `${year + 1}-01-01` }
}

export function resolvePaymentPool(
  type: string,
  program: string,
  videoFormat?: string | null,
): PaymentPool | null {
  if (program === 'platform') return null
  if (program === 'student_cinema') return 'student'
  const normalized = normalizeContentType(type)
  if (normalized === 'kisa-film') return 'short'
  if (normalized === 'belgesel') return 'documentary'
  if (videoFormat === 'vertical') return 'documentary'
  return 'long'
}

function ensureSettlementPeriodRow(periodId: string) {
  parsePaymentPeriodId(periodId)
  const exists = dbGet('SELECT period_id FROM payment_settlement_periods WHERE period_id = ?', [periodId])
  if (!exists) {
    dbRun(
      `INSERT INTO payment_settlement_periods (period_id, net_revenue, status, updated_at)
       VALUES (?, 0, 'open', ?)`,
      [periodId, new Date().toISOString()],
    )
  }
}

function aggregateCompletionForRange(start: string, endExclusive: string) {
  const rows = dbAll<{
    content_id: string
    type: string
    program: string
    position_seconds: number
    duration_seconds: number
  }>(
    `SELECT
      wp.content_id,
      c.type,
      c.program,
      wp.position_seconds,
      wp.duration_seconds
    FROM watch_progress wp
    JOIN content c ON c.id = wp.content_id
    WHERE wp.duration_seconds > 0
      AND wp.position_seconds > 0
      AND EXISTS (
        SELECT 1
        FROM watch_activity wa
        WHERE wa.profile_id = wp.profile_id
          AND wa.content_id = wp.content_id
          AND wa.activity_date >= ?
          AND wa.activity_date < ?
      )`,
    [start, endExclusive],
  )

  const buckets = new Map<
    string,
    { totalCompletion: number; viewers: number; qualifiedViewers: number; type: string; program: string }
  >()

  for (const row of rows) {
    const completion = row.position_seconds / row.duration_seconds
    const threshold = getWatchThreshold(row.type, row.program)
    const bucket = buckets.get(row.content_id) ?? {
      totalCompletion: 0,
      viewers: 0,
      qualifiedViewers: 0,
      type: row.type,
      program: row.program,
    }
    bucket.totalCompletion += completion
    bucket.viewers += 1
    if (completion >= threshold) bucket.qualifiedViewers += 1
    buckets.set(row.content_id, bucket)
  }

  const result = new Map<string, { avgCompletionPercent: number; qualifiedViewerPercent: number }>()
  for (const [contentId, bucket] of buckets) {
    result.set(contentId, {
      avgCompletionPercent:
        bucket.viewers > 0 ? Math.round((bucket.totalCompletion / bucket.viewers) * 1000) / 10 : 0,
      qualifiedViewerPercent:
        bucket.viewers > 0 ? Math.round((bucket.qualifiedViewers / bucket.viewers) * 1000) / 10 : 0,
    })
  }
  return result
}

function aggregateHalfYearWatch(periodId: string) {
  const months = paymentPeriodMonths(periodId)
  const merged = new Map<
    string,
    {
      contentId: string
      title: string
      type: string
      program: 'standard' | 'student_cinema'
      videoFormat: string | null
      creatorId: string | null
      creatorName: string | null
      studioName: string | null
      qualifiedSeconds: number
      watchSeconds: number
      viewerCount: number
    }
  >()

  for (const month of months) {
    const report = getMonthlyReport(month)
    for (const item of report.items) {
      if (item.program === 'platform') continue
      const meta = dbGet<{ video_format: string | null }>(
        'SELECT video_format FROM content WHERE id = ?',
        [item.contentId],
      )
      const pool = resolvePaymentPool(item.type, item.program, meta?.video_format)
      if (!pool) continue

      const existing = merged.get(item.contentId)
      if (existing) {
        existing.qualifiedSeconds += item.qualifiedSeconds ?? item.qualifiedMinutes * 60
        existing.watchSeconds += item.watchSeconds ?? item.watchMinutes * 60
        existing.viewerCount = Math.max(existing.viewerCount, item.viewerCount)
      } else {
        merged.set(item.contentId, {
          contentId: item.contentId,
          title: item.title,
          type: item.type,
          program: item.program as 'standard' | 'student_cinema',
          videoFormat: meta?.video_format ?? null,
          creatorId: item.creatorId,
          creatorName: item.creatorName,
          studioName: item.studioName,
          qualifiedSeconds: item.qualifiedSeconds ?? item.qualifiedMinutes * 60,
          watchSeconds: item.watchSeconds ?? item.watchMinutes * 60,
          viewerCount: item.viewerCount,
        })
      }
    }
  }

  return [...merged.values()]
}

function listAvailablePeriodIds() {
  const earliest = dbGet<{ month: string }>(
    `SELECT MIN(substr(activity_date, 1, 7)) AS month FROM creator_qualified_activity`,
  )
  const currentYear = new Date().getFullYear()
  let startYear = currentYear - 1
  if (earliest?.month) {
    startYear = Math.min(startYear, Number(earliest.month.slice(0, 4)))
  }

  const ids: string[] = []
  for (let year = startYear; year <= currentYear; year += 1) {
    ids.push(`${year}-H1`, `${year}-H2`)
  }
  return [...new Set(ids)].sort().reverse()
}

export function listSettlementPeriods() {
  const ids = listAvailablePeriodIds()
  const current = currentPaymentPeriodId()
  if (!ids.includes(current)) ids.unshift(current)

  return ids.map((periodId) => {
    ensureSettlementPeriodRow(periodId)
    const row = dbGet<{ status: string; confirmed_at: string | null; paid_at: string | null }>(
      'SELECT status, confirmed_at, paid_at FROM payment_settlement_periods WHERE period_id = ?',
      [periodId],
    )
    return {
      periodId,
      label: paymentPeriodLabel(periodId),
      status: (row?.status ?? 'open') as SettlementStatus,
      isCurrent: periodId === current,
      confirmedAt: row?.confirmed_at ?? null,
      paidAt: row?.paid_at ?? null,
    }
  })
}

function buildShareItems(
  rows: ReturnType<typeof aggregateHalfYearWatch>,
  completionByContent: Map<string, { avgCompletionPercent: number; qualifiedViewerPercent: number }>,
): Pick<
  SettlementReport,
  'items' | 'creators' | 'poolSummaries' | 'totalCreatorSharePercent' | 'totalQualifiedMinutes' | 'totalWatchMinutes'
> {
  const poolTotals: Record<PaymentPool, number> = { short: 0, student: 0, documentary: 0, long: 0 }
  const poolContentCounts: Record<PaymentPool, number> = { short: 0, student: 0, documentary: 0, long: 0 }

  const enriched = rows.map((row) => {
    const pool = resolvePaymentPool(row.type, row.program, row.videoFormat)!
    poolTotals[pool] += row.qualifiedSeconds
    const completion = completionByContent.get(row.contentId)
    return { ...row, pool, completion }
  })

  let unallocatedPercent = 0
  const items: SettlementContentItem[] = enriched
    .filter((row) => row.qualifiedSeconds > 0)
    .map((row) => {
      const categoryTotal = poolTotals[row.pool]
      const poolRate = REVENUE_POOL_RATES[row.pool]
      let poolSharePercent = 0
      let profitSharePercent = 0

      if (categoryTotal > 0) {
        poolSharePercent = Math.round((row.qualifiedSeconds / categoryTotal) * 1000) / 10
        profitSharePercent = Math.round(poolRate * (row.qualifiedSeconds / categoryTotal) * 1000) / 10
      }

      return {
        contentId: row.contentId,
        title: row.title,
        type: row.type,
        program: row.program,
        pool: row.pool,
        poolLabel: POOL_LABELS[row.pool],
        poolRatePercent: POOL_RATE_PERCENT[row.pool],
        creatorId: row.creatorId,
        creatorName: row.creatorName,
        studioName: row.studioName,
        qualifiedMinutes: Math.round(row.qualifiedSeconds / 60),
        watchMinutes: Math.round(row.watchSeconds / 60),
        viewerCount: row.viewerCount,
        avgCompletionPercent: row.completion?.avgCompletionPercent ?? 0,
        qualifiedViewerPercent: row.completion?.qualifiedViewerPercent ?? 0,
        poolSharePercent,
        profitSharePercent,
      }
    })
    .sort((a, b) => b.profitSharePercent - a.profitSharePercent)

  for (const pool of ['short', 'student', 'documentary', 'long'] as PaymentPool[]) {
    poolContentCounts[pool] = items.filter((item) => item.pool === pool).length
    if (poolTotals[pool] <= 0) {
      unallocatedPercent += POOL_RATE_PERCENT[pool]
    }
  }

  const creatorMap = new Map<string, SettlementCreatorItem>()
  for (const item of items) {
    if (!item.creatorId) continue
    const existing = creatorMap.get(item.creatorId)
    if (existing) {
      existing.qualifiedMinutes += item.qualifiedMinutes
      existing.profitSharePercent = Math.round((existing.profitSharePercent + item.profitSharePercent) * 10) / 10
      existing.contentCount += 1
    } else {
      creatorMap.set(item.creatorId, {
        creatorId: item.creatorId,
        creatorName: item.creatorName,
        studioName: item.studioName,
        qualifiedMinutes: item.qualifiedMinutes,
        profitSharePercent: item.profitSharePercent,
        contentCount: 1,
      })
    }
  }

  const poolSummaries: SettlementPoolSummary[] = [
    {
      pool: 'plooy',
      label: BRAND_NAME,
      ratePercent: POOL_RATE_PERCENT.plooy,
      effectiveRatePercent: POOL_RATE_PERCENT.plooy + unallocatedPercent,
      qualifiedMinutes: 0,
      contentCount: 0,
    },
    ...(['short', 'student', 'documentary', 'long'] as PaymentPool[]).map((pool) => ({
      pool,
      label: POOL_LABELS[pool],
      ratePercent: POOL_RATE_PERCENT[pool],
      effectiveRatePercent: poolTotals[pool] > 0 ? POOL_RATE_PERCENT[pool] : 0,
      qualifiedMinutes: Math.round(poolTotals[pool] / 60),
      contentCount: poolContentCounts[pool],
    })),
  ]

  const totalQualifiedMinutes = Math.round(rows.reduce((sum, row) => sum + row.qualifiedSeconds, 0) / 60)
  const totalWatchMinutes = Math.round(rows.reduce((sum, row) => sum + row.watchSeconds, 0) / 60)
  const totalCreatorSharePercent =
    Math.round(items.reduce((sum, item) => sum + item.profitSharePercent, 0) * 10) / 10

  return {
    items,
    creators: [...creatorMap.values()].sort((a, b) => b.profitSharePercent - a.profitSharePercent),
    poolSummaries,
    totalCreatorSharePercent,
    totalQualifiedMinutes,
    totalWatchMinutes,
  }
}

export function getSettlementReport(periodId: string): SettlementReport {
  parsePaymentPeriodId(periodId)
  ensureSettlementPeriodRow(periodId)

  const row = dbGet<{ status: string; confirmed_at: string | null; paid_at: string | null }>(
    'SELECT status, confirmed_at, paid_at FROM payment_settlement_periods WHERE period_id = ?',
    [periodId],
  )

  const status = (row?.status ?? 'open') as SettlementStatus
  const { start, endExclusive } = paymentPeriodDateRange(periodId)
  const watchRows = aggregateHalfYearWatch(periodId)
  const completionByContent = aggregateCompletionForRange(start, endExclusive)
  const share = buildShareItems(watchRows, completionByContent)

  return {
    periodId,
    label: paymentPeriodLabel(periodId),
    months: paymentPeriodMonths(periodId),
    status,
    isEditable: status === 'open',
    confirmedAt: row?.confirmed_at ?? null,
    paidAt: row?.paid_at ?? null,
    ...share,
  }
}

export function confirmSettlementPeriod(periodId: string) {
  parsePaymentPeriodId(periodId)
  ensureSettlementPeriodRow(periodId)

  const row = dbGet<{ status: string }>('SELECT status FROM payment_settlement_periods WHERE period_id = ?', [
    periodId,
  ])
  if (row?.status !== 'open') {
    throw new Error('Yalnızca açık dönemler onaylanabilir.')
  }

  const now = new Date().toISOString()
  dbRun(
    `UPDATE payment_settlement_periods SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE period_id = ?`,
    [now, now, periodId],
  )

  return getSettlementReport(periodId)
}

export function markSettlementPaid(periodId: string) {
  parsePaymentPeriodId(periodId)
  ensureSettlementPeriodRow(periodId)

  const row = dbGet<{ status: string }>('SELECT status FROM payment_settlement_periods WHERE period_id = ?', [
    periodId,
  ])
  if (row?.status !== 'confirmed') {
    throw new Error('Ödendi işaretlemek için dönem önce onaylanmalı.')
  }

  const now = new Date().toISOString()
  dbRun(
    `UPDATE payment_settlement_periods SET status = 'paid', paid_at = ?, updated_at = ? WHERE period_id = ?`,
    [now, now, periodId],
  )

  return getSettlementReport(periodId)
}

export function reopenSettlementPeriod(periodId: string) {
  parsePaymentPeriodId(periodId)
  ensureSettlementPeriodRow(periodId)

  const row = dbGet<{ status: string }>('SELECT status FROM payment_settlement_periods WHERE period_id = ?', [
    periodId,
  ])
  if (row?.status === 'open') {
    throw new Error('Dönem zaten açık.')
  }

  const now = new Date().toISOString()
  dbRun(
    `UPDATE payment_settlement_periods
     SET status = 'open', confirmed_at = NULL, paid_at = NULL, updated_at = ?
     WHERE period_id = ?`,
    [now, periodId],
  )

  return getSettlementReport(periodId)
}
