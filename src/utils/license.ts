import type { AdminContentItem, ContentItem } from '../types/content'

const DAY_MS = 24 * 60 * 60 * 1000

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

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function formatLicenseDate(iso: string | null | undefined): string {
  if (!iso) return 'Sınırsız'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function toAdminContentItem(item: ContentItem): AdminContentItem {
  return {
    ...item,
    contentAddedAt: null,
    licenseExpiresAt: null,
    licenseUnlimited: true,
    licenseExpired: false,
    licenseExpiringSoon: false,
    licenseDaysRemaining: null,
    publishedAt: null,
    isPublished: true,
    isScheduled: false,
  }
}

export function mergeAdminCatalog(
  items: ContentItem[],
  adminItems: AdminContentItem[],
): AdminContentItem[] {
  if (adminItems.length === 0) return items.map(toAdminContentItem)

  const adminById = new Map(adminItems.map((item) => [item.id, item]))
  return items.map((item) => adminById.get(item.id) ?? toAdminContentItem(item))
}
