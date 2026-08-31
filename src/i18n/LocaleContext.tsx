import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  detectLocale,
  localizePath,
  switchLocalePath,
  type Locale,
} from './paths'

interface LocaleContextValue {
  locale: Locale
  localizePath: (trPath: string) => string
  switchLocalePath: (path?: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const locale = detectLocale(location.pathname)

  const localize = useCallback(
    (trPath: string) => localizePath(trPath, locale),
    [locale],
  )

  const switchPath = useCallback(
    (path?: string) => {
      const current = path ?? `${location.pathname}${location.search}`
      const target: Locale = locale === 'tr' ? 'en' : 'tr'
      return switchLocalePath(current, target)
    },
    [locale, location.pathname, location.search],
  )

  const value = useMemo(
    () => ({ locale, localizePath: localize, switchLocalePath: switchPath }),
    [locale, localize, switchPath],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return ctx
}

/** Safe fallback when provider is unavailable (e.g. tests) */
export function useLocalizedPath(trPath: string): string {
  const ctx = useContext(LocaleContext)
  if (!ctx) return trPath
  return ctx.localizePath(trPath)
}
