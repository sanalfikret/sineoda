export const SITE_NAV_IDS = [
  'home',
  'diziler',
  'filmler',
  'belgeseller',
  'dikey',
  'gencSinema',
  'cekimNotlari',
  'listem',
  'dergi',
] as const

export type SiteNavId = (typeof SITE_NAV_IDS)[number]

export interface SiteNavItemDef {
  id: SiteNavId
  label: string
  path: string
  match: (path: string) => boolean
}

export const SITE_NAV_ITEMS: SiteNavItemDef[] = [
  { id: 'home', label: 'Ana Sayfa', path: '/', match: (path) => path === '/' },
  { id: 'diziler', label: 'Diziler', path: '/diziler', match: (path) => path === '/diziler' },
  { id: 'filmler', label: 'Filmler', path: '/filmler', match: (path) => path === '/filmler' },
  {
    id: 'belgeseller',
    label: 'Belgeseller',
    path: '/belgeseller',
    match: (path) => path === '/belgeseller',
  },
  {
    id: 'dikey',
    label: 'Dikey Diziler',
    path: '/dikey-diziler',
    match: (path) => path === '/dikey-diziler',
  },
  {
    id: 'gencSinema',
    label: 'Genç Sinema',
    path: '/genc-sinema',
    match: (path) => path === '/genc-sinema',
  },
  {
    id: 'cekimNotlari',
    label: 'Çekim Notları',
    path: '/cekim-notlari',
    match: (path) => path === '/cekim-notlari',
  },
  { id: 'listem', label: 'Listem', path: '/listem', match: (path) => path === '/listem' },
  {
    id: 'dergi',
    label: 'Dergi',
    path: '/dergi',
    match: (path) => path === '/dergi' || path.startsWith('/dergi/'),
  },
]

export interface SiteNavConfig {
  hidden: SiteNavId[]
  items: Array<SiteNavItemDef & { hidden: boolean }>
}

export const DEFAULT_SITE_NAV: SiteNavConfig = {
  hidden: [],
  items: SITE_NAV_ITEMS.map((item) => ({ ...item, hidden: false })),
}

export { NAV_CATEGORY_SYNC, getNavIdForCategory, NAV_LABELS, STANDALONE_CATEGORY_IDS } from './siteNavLinks'
