import { dbRun } from '../db.js'

export const TR_MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const

export interface MonthlyAwardInput {
  enabled: boolean
  period?: string | null
  badge?: string | null
  prize?: string | null
}

export interface MonthlyAwardState {
  enabled: boolean
  period: string | null
  badge: string | null
  prize: string | null
}

export function parseAwardPeriod(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}$/.test(raw)) return null
  const month = Number(raw.slice(5, 7))
  if (month < 1 || month > 12) return null
  return raw
}

export function defaultBadgeForPeriod(period: string) {
  const month = Number(period.slice(5, 7))
  const name = TR_MONTH_NAMES[month - 1]
  return name ? `${name} Birincisi` : 'Ayın Birincisi'
}

export function mapMonthlyAwardRow(row: {
  monthly_award_enabled?: number | null
  monthly_award_period?: string | null
  monthly_award_badge?: string | null
  monthly_award_prize?: string | null
}): MonthlyAwardState {
  return {
    enabled: row.monthly_award_enabled === 1,
    period: row.monthly_award_period ?? null,
    badge: row.monthly_award_badge ?? null,
    prize: row.monthly_award_prize ?? null,
  }
}

export function applyMonthlyAward(contentId: string, input: MonthlyAwardInput) {
  const enabled = input.enabled === true

  if (!enabled) {
    dbRun(
      `UPDATE content SET
        monthly_award_enabled = 0,
        monthly_award_period = NULL,
        monthly_award_badge = NULL,
        monthly_award_prize = NULL
      WHERE id = ?`,
      [contentId],
    )
    return mapMonthlyAwardRow({
      monthly_award_enabled: 0,
      monthly_award_period: null,
      monthly_award_badge: null,
      monthly_award_prize: null,
    })
  }

  const period = parseAwardPeriod(input.period)
  if (!period) {
    throw new Error('Ayın birincisi için geçerli bir dönem seçin (YYYY-AA).')
  }

  const badge = String(input.badge ?? '').trim() || defaultBadgeForPeriod(period)
  const prize = String(input.prize ?? '').trim() || null

  dbRun(
    `UPDATE content SET monthly_award_enabled = 0
     WHERE program = 'student_cinema'
       AND id != ?
       AND monthly_award_period = ?`,
    [contentId, period],
  )

  dbRun(
    `UPDATE content SET
      monthly_award_enabled = 1,
      monthly_award_period = ?,
      monthly_award_badge = ?,
      monthly_award_prize = ?
    WHERE id = ?`,
    [period, badge, prize, contentId],
  )

  return mapMonthlyAwardRow({
    monthly_award_enabled: 1,
    monthly_award_period: period,
    monthly_award_badge: badge,
    monthly_award_prize: prize,
  })
}

export function getMonthlyAwardWinnersSql() {
  return `c.monthly_award_enabled = 1 AND c.monthly_award_period IS NOT NULL`
}
