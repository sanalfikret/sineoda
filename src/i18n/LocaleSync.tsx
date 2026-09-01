import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setI18nLocale } from './index'
import {
  detectBrowserLocale,
  getSavedLocale,
  isLocaleManual,
  markLocaleManual,
} from './localePreference'
import {
  detectLocale,
  isAdminOrInternalPath,
  localizePathname,
  LOCALE_STORAGE_KEY,
  toTrPathname,
} from './paths'

/** Keeps i18n + URL aligned; browser locale on first visit; manual choice sticks. */
export function LocaleSync() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const bootRedirectDone = useRef(false)

  useEffect(() => {
    const urlLocale = detectLocale(pathname)
    setI18nLocale(urlLocale)

    if (isAdminOrInternalPath(pathname)) return

    const manual = isLocaleManual()
    const saved = getSavedLocale()

    // First visit: suggest locale from browser (home only, once per session)
    if (!manual && !bootRedirectDone.current && pathname === '/') {
      const browser = detectBrowserLocale()
      if (browser === 'en') {
        bootRedirectDone.current = true
        navigate(`/en${search}`, { replace: true })
        return
      }
    }

    // User chose a language — keep URLs on that locale (bad links must not flip TR/EN)
    if (manual && saved) {
      if (saved !== urlLocale) {
        const trPath = toTrPathname(pathname)
        const target = `${localizePathname(trPath, saved)}${search}`
        navigate(target, { replace: true })
      }
      return
    }

    // Remember implicit choice from URL until user picks manually
    if (!manual && (pathname === '/' || pathname === '/en' || pathname.startsWith('/en/'))) {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, urlLocale)
      } catch {
        /* ignore */
      }
    }
  }, [pathname, search, navigate])

  return null
}

export { markLocaleManual }
