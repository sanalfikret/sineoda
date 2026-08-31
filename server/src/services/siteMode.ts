import { dbGet, dbRun } from '../db.js'

const SETTINGS_KEY = 'site_mode'

export interface SiteModeConfig {
  enabled: boolean
  launchAt: string | null
  headline: string
  subheadline: string
  allowViewerSignup: boolean
}

const DEFAULTS: SiteModeConfig = {
  enabled: false,
  launchAt: '2026-11-01T00:00:00+03:00',
  headline: 'Yakında açılıyoruz',
  subheadline: 'Bağımsız sinemanın yeni adresi geliyor. Film başvuruları şimdiden açık.',
  allowViewerSignup: false,
}

function normalizeSiteMode(raw: unknown): SiteModeConfig {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const launchAt =
    typeof input.launchAt === 'string' && input.launchAt.trim() ? input.launchAt.trim() : DEFAULTS.launchAt

  return {
    enabled: input.enabled === true,
    launchAt,
    headline:
      typeof input.headline === 'string' && input.headline.trim()
        ? input.headline.trim()
        : DEFAULTS.headline,
    subheadline:
      typeof input.subheadline === 'string' && input.subheadline.trim()
        ? input.subheadline.trim()
        : DEFAULTS.subheadline,
    allowViewerSignup: input.allowViewerSignup === true,
  }
}

export function getSiteMode(): SiteModeConfig {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) return { ...DEFAULTS }
  try {
    return normalizeSiteMode(JSON.parse(row.value))
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSiteMode(input: Partial<SiteModeConfig>) {
  const current = getSiteMode()
  const next = normalizeSiteMode({ ...current, ...input })
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(next),
  ])
  return next
}

export function isComingSoonActive() {
  return getSiteMode().enabled
}

export function canBypassComingSoon(role?: string | null) {
  return role === 'admin' || role === 'manager'
}

export function assertSiteOpenForViewers(role?: string | null) {
  if (!isComingSoonActive()) return null
  if (canBypassComingSoon(role)) return null
  return {
    status: 503,
    body: {
      error: 'Platform henüz açılmadı. Üyelik ve izleme yakında başlayacak.',
      code: 'SITE_COMING_SOON',
    },
  }
}
