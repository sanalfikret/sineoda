/** Single source of truth for TR/EN public route paths. Used by router + locale helpers. */
export interface RoutePair {
  tr: string
  en: string
}

export const ROUTE_PAIRS: RoutePair[] = [
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
  { tr: '/izleme-gecmisi', en: '/en/watch-history' },
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

/** TR canonical paths that require sign-in (login back-button safety). */
export const AUTH_REQUIRED_TR_PATHS = [
  '/hesap',
  '/profiller',
  '/mesajlar',
  '/listem',
  '/izleme-gecmisi',
  '/icerik/:id',
  '/diziler',
  '/filmler',
  '/belgeseller',
  '/stand-up',
  '/klasikler',
  '/dikey-diziler',
  '/genc-sinema',
  '/cekim-notlari',
  '/kisa-filmler',
  '/creator',
  '/creator/odeme',
] as const

/** Old bookmark URLs without /en prefix → TR canonical path. */
export const LEGACY_EN_REDIRECTS = [
  { from: '/login', trPath: '/giris' },
  { from: '/signup', trPath: '/kayit' },
  { from: '/plans', trPath: '/planlar' },
  { from: '/journal', trPath: '/dergi' },
] as const
