import {
  DEFAULT_LOCALE,
  LOCALE_MANUAL_KEY,
  LOCALE_STORAGE_KEY,
  type Locale,
} from './paths'

export function getSavedLocale(): Locale | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY)
    return value === 'tr' || value === 'en' ? value : null
  } catch {
    return null
  }
}

export function isLocaleManual(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(LOCALE_MANUAL_KEY) === '1'
  } catch {
    return false
  }
}

export function markLocaleManual(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_MANUAL_KEY, '1')
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    /* private mode */
  }
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const lang = (navigator.language || '').toLowerCase()
  if (lang.startsWith('en')) return 'en'
  return DEFAULT_LOCALE
}
