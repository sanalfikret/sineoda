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

export interface MonthlyAward {
  enabled: boolean
  period: string | null
  badge: string | null
  prize: string | null
}

export function defaultBadgeForPeriod(period: string) {
  const month = Number(period.slice(5, 7))
  const name = TR_MONTH_NAMES[month - 1]
  return name ? `${name} Birincisi` : 'Ayın Birincisi'
}

export function currentAwardPeriod() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export function formatAwardPeriod(period: string) {
  const month = Number(period.slice(5, 7))
  const year = period.slice(0, 4)
  const name = TR_MONTH_NAMES[month - 1]
  return name ? `${name} ${year}` : period
}
