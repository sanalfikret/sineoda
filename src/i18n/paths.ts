export type Locale = 'tr' | 'en'

export const DEFAULT_LOCALE: Locale = 'tr'
export const LOCALE_STORAGE_KEY = 'plooy_locale'

export const SUPPORTED_LOCALES: Locale[] = ['tr', 'en']

interface RoutePair {
  tr: string
  en: string
}

/** TR canonical path ↔ EN path (supports :param segments) */
const ROUTE_PAIRS: RoutePair[] = [
  { tr: '/', en: '/en' },
  { tr: '/tanitim', en: '/en/about' },
  { tr: '/giris', en: '/en/login' },
  { tr: '/kayit', en: '/en/signup' },
  { tr: '/eposta-dogrula', en: '/en/verify-email' },
  { tr: '/sifremi-unuttum', en: '/en/forgot-password' },
  { tr: '/sifre-sifirla', en: '/en/reset-password' },
  { tr: '/planlar', en: '/en/plans' },
  { tr: '/iletisim', en: '/en/contact' },
  { tr: '/dergi', en: '/en/journal' },
  { tr: '/dergi/:slug', en: '/en/journal/:slug' },
  { tr: '/yasal/:slug', en: '/en/legal/:slug' },
  { tr: '/odeme/paytr', en: '/en/payment/paytr' },
  { tr: '/odeme/basarili', en: '/en/payment/success' },
  { tr: '/odeme/basarisiz', en: '/en/payment/failed' },
  { tr: '/hesap', en: '/en/account' },
  { tr: '/profiller', en: '/en/profiles' },
  { tr: '/mesajlar', en: '/en/messages' },
  { tr: '/listem', en: '/en/my-list' },
  { tr: '/icerik/:id', en: '/en/content/:id' },
  { tr: '/diziler', en: '/en/series' },
  { tr: '/filmler', en: '/en/films' },
  { tr: '/belgeseller', en: '/en/documentaries' },
  { tr: '/stand-up', en: '/en/stand-up' },
  { tr: '/klasikler', en: '/en/classics' },
  { tr: '/dikey-diziler', en: '/en/vertical-series' },
  { tr: '/genc-sinema', en: '/en/student-cinema' },
  { tr: '/cekim-notlari', en: '/en/production-notes' },
  { tr: '/kisa-filmler', en: '/en/short-films' },
  { tr: '/creator/giris', en: '/en/creator/login' },
  { tr: '/creator/kayit', en: '/en/creator/register' },
  { tr: '/creator/odeme', en: '/en/creator/payment' },
  { tr: '/creator', en: '/en/creator' },
]

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
