/**
 * Takvim ayı ekler; ay sonu taşmasını kırpar (31 Ocak + 1 ay = 28/29 Şubat, 3 Mart değil).
 * planExpiryFor ile aynı UTC mantığı.
 */
export function addCalendarMonths(base: Date, months: number) {
  const next = new Date(base)
  if (!Number.isFinite(months) || months === 0) return next
  const day = next.getUTCDate()
  next.setUTCDate(1)
  next.setUTCMonth(next.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(day, lastDay))
  return next
}
