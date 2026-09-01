import { AUTH_REQUIRED_TR_PATHS, ROUTE_PAIRS, type RoutePair } from '../routes/registry'

export type Locale = 'tr' | 'en'

export const DEFAULT_LOCALE: Locale = 'tr'
export const LOCALE_STORAGE_KEY = 'plooy_locale'
/** Set when user explicitly picks TR/EN — prevents auto locale changes. */
export const LOCALE_MANUAL_KEY = 'plooy_locale_manual'

export const SUPPORTED_LOCALES: Locale[] = ['tr', 'en']

export { ROUTE_PAIRS } from '../routes/registry'

function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const segment = patternParts[i]
    const value = pathParts[i]
    if (segment.startsWith(':')) {
      params[segment.slice(1)] = decodeURIComponent(value)
    } else if (segment !== value) {
      return null
    }
  }
  return params
}

function buildPattern(pattern: string, params: Record<string, string>): string {
  const built = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        const key = segment.slice(1)
        return params[key] ? encodeURIComponent(params[key]) : segment
      }
      return segment
    })
    .join('/')
  return built.startsWith('/') ? built : `/${built}`
}

function findPairForPathname(pathname: string): { pair: RoutePair; params: Record<string, string>; side: 'tr' | 'en' } | null {
  for (const pair of ROUTE_PAIRS) {
    const trParams = matchPattern(pair.tr, pathname)
    if (trParams) return { pair, params: trParams, side: 'tr' }
    const enParams = matchPattern(pair.en, pathname)
    if (enParams) return { pair, params: enParams, side: 'en' }
  }
  return null
}

export function detectLocale(pathname: string): Locale {
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en'
  return 'tr'
}

export function toTrPathname(pathname: string): string {
  const match = findPairForPathname(pathname)
  if (!match) return pathname
  if (match.side === 'tr') return buildPattern(match.pair.tr, match.params)
  return buildPattern(match.pair.tr, match.params)
}

export function localizePathname(pathname: string, locale: Locale): string {
  const match = findPairForPathname(pathname)
  if (!match) return pathname
  const pattern = locale === 'en' ? match.pair.en : match.pair.tr
  return buildPattern(pattern, match.params)
}

export function localizePath(pathWithQuery: string, locale: Locale): string {
  const qIndex = pathWithQuery.indexOf('?')
  const pathname = qIndex >= 0 ? pathWithQuery.slice(0, qIndex) : pathWithQuery
  const search = qIndex >= 0 ? pathWithQuery.slice(qIndex) : ''
  const trPath = detectLocale(pathname) === 'en' ? toTrPathname(pathname) : pathname
  const localized = localizePathname(trPath, locale)
  return `${localized}${search}`
}

export function switchLocalePath(pathWithQuery: string, target: Locale): string {
  const qIndex = pathWithQuery.indexOf('?')
  const pathname = qIndex >= 0 ? pathWithQuery.slice(0, qIndex) : pathWithQuery
  const search = qIndex >= 0 ? pathWithQuery.slice(qIndex) : ''
  const trPath = toTrPathname(pathname)
  const localized = localizePathname(trPath, target)
  return `${localized}${search}`
}

/** React Router `path` prop: [trPath, enPath] */
export function localePaths(tr: string, en: string): [string, string] {
  return [tr, en]
}

export function isAdminOrInternalPath(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api')
}

/** Paths reachable without signing in — safe login "back" targets. */
export function isPublicPath(pathWithQuery: string): boolean {
  const path = pathWithQuery.split('?')[0]
  if (path === '/' || path === '/en') return true
  if (path.startsWith('/yasal/') || path.startsWith('/en/legal/')) return true
  if (path.startsWith('/dergi/') || path.startsWith('/en/journal/')) return true
  for (const pair of ROUTE_PAIRS) {
    if (matchPattern(pair.tr, path) || matchPattern(pair.en, path)) {
      const trAuth = AUTH_REQUIRED_TR_PATHS.some((p) => matchPattern(p, pair.tr))
      return !trAuth
    }
  }
  return false
}
