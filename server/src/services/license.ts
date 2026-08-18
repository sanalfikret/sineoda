const DAY_MS = 24 * 60 * 60 * 1000

export function parseLicenseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function parseContentAddedAt(value: unknown, fallback = new Date()): string {
  const parsed = parseLicenseDate(value)
  return parsed ?? fallback.toISOString()
}

export function isLicenseUnlimited(expiresAt: string | null | undefined): boolean {
  return !expiresAt
}

export function getLicenseDaysRemaining(expiresAt: string, now = new Date()): number {
  const end = new Date(expiresAt)
  return Math.ceil((end.getTime() - now.getTime()) / DAY_MS)
}

export function isLicenseExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false
  return getLicenseDaysRemaining(expiresAt, now) < 0
}

export function isLicenseExpiringSoon(
  expiresAt: string | null | undefined,
  withinDays = 30,
  now = new Date(),
): boolean {
  if (!expiresAt) return false
  const days = getLicenseDaysRemaining(expiresAt, now)
  return days >= 0 && days <= withinDays
}
