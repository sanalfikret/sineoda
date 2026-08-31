import i18n from './index'
import type { Locale } from './paths'

export function tKey(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options)
}

export function planDisplayName(planId: string | null | undefined) {
  if (!planId) return i18n.t('common:actions.empty')
  const key = `pricing:plans.${planId}`
  const translated = i18n.t(key)
  if (translated !== key) return translated
  return planId
}

export function dateLocale(locale: Locale) {
  return locale === 'en' ? 'en-GB' : 'tr-TR'
}

export function formatDate(iso: string | null | undefined, locale: Locale) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(dateLocale(locale))
}
