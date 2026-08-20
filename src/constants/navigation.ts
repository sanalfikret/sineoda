import { CONTENT_TYPES, type ContentType } from './contentTypes'
import { LEGAL_LINKS } from './legal'

export interface NavItem {
  label: string
  to: string
  accent?: 'emerald'
}

/** İzleyici üst menü — katalog sayfaları ile birebir */
export const VIEWER_NAV_ITEMS: NavItem[] = [
  { label: 'Ana Sayfa', to: '/' },
  { label: 'Diziler', to: '/diziler' },
  { label: 'Filmler', to: '/filmler' },
  { label: 'Belgeseller', to: '/belgeseller' },
  { label: 'Kısa Filmler', to: '/kisa-filmler' },
  { label: 'Dikey Diziler', to: '/dikey-diziler' },
  { label: 'Genç Sinema', to: '/genc-sinema', accent: 'emerald' },
  { label: 'Listem', to: '/listem' },
  { label: 'Dergi', to: '/dergi' },
]

/** Yapımcı hesabı AppShell'e düşerse yalnızca panel */
export const CREATOR_NAV_ITEMS: NavItem[] = [
  { label: 'Yapımcı Paneli', to: '/creator' },
]

export const LANDING_NAV_ITEMS: NavItem[] = [
  { label: 'Dergi', to: '/dergi' },
  { label: 'Planlar', to: '/planlar' },
]

export const ADMIN_NAV_ITEMS: Array<NavItem & { end?: boolean }> = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/icerikler', label: 'İçerikler' },
  { to: '/admin/kategoriler', label: 'Kategoriler' },
  { to: '/admin/ana-sayfa', label: 'Ana Sayfa' },
  { to: '/admin/dergi', label: 'Dergi' },
  { to: '/admin/kullanicilar', label: 'İzleyiciler' },
  { to: '/admin/yapimcilar', label: 'Yapımcılar' },
  { to: '/admin/genc-sinema', label: 'Genç Sinema' },
]

export const FOOTER_PUBLIC_LINKS: NavItem[] = [
  { label: 'Dergi', to: '/dergi' },
  { label: 'İletişim', to: '/iletisim' },
]

export const FOOTER_PRODUCER_LINKS: NavItem[] = [
  { label: 'Yapımcı Girişi', to: '/creator/giris' },
  { label: 'Filmini Yükle', to: '/creator/kayit' },
]

export const CONTENT_TYPE_BROWSE_PATHS: Record<ContentType, string> = {
  dizi: '/diziler',
  film: '/filmler',
  belgesel: '/belgeseller',
  'kisa-film': '/kisa-filmler',
}

/** Ana sayfa satır başlığı → ilgili katalog menüsü */
export const BROWSE_ROW_VIEW_ALL: Record<string, string> = {
  'Popüler Diziler': '/diziler',
  Belgeseller: '/belgeseller',
  'Dikey Diziler': '/dikey-diziler',
  'Kısa Filmler': '/kisa-filmler',
  'Kısa Film': '/kisa-filmler',
}

export const REGISTERED_APP_PATHS = [
  '/',
  '/giris',
  '/kayit',
  '/sifremi-unuttum',
  '/sifre-sifirla',
  '/planlar',
  '/yasal/:slug',
  '/iletisim',
  '/dergi',
  '/odeme/paytr',
  '/odeme/basarili',
  '/odeme/basarisiz',
  '/profiller',
  '/listem',
  '/icerik/:id',
  '/diziler',
  '/filmler',
  '/belgeseller',
  '/dikey-diziler',
  '/genc-sinema',
  '/kisa-filmler',
  '/admin/giris',
  '/creator/giris',
  '/creator/kayit',
  '/creator',
  '/admin',
  '/admin/icerikler',
  '/admin/icerikler/yeni',
  '/admin/kategoriler',
  '/admin/ana-sayfa',
  '/admin/dergi',
  '/admin/kullanicilar',
  '/admin/yapimcilar',
  '/admin/genc-sinema',
] as const

export function navItemIsActive(item: NavItem, pathname: string) {
  if (item.to === '/') return pathname === '/'
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

export function getBrowseRowViewAllHref(title: string) {
  return BROWSE_ROW_VIEW_ALL[title]
}

export function footerLegalLinks() {
  return LEGAL_LINKS.map((link) => ({
    label: link.label,
    to: `/yasal/${link.slug}`,
  }))
}

export function contentTypeBrowsePaths() {
  return CONTENT_TYPES.map((entry) => CONTENT_TYPE_BROWSE_PATHS[entry.value])
}
