export const SITE_NAV_IDS = [
  'home',
  'diziler',
  'filmler',
  'belgeseller',
  'standup',
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
}

export const SITE_NAV_ITEMS: SiteNavItemDef[] = [
  { id: 'home', label: 'Ana Sayfa', path: '/' },
  { id: 'diziler', label: 'Diziler', path: '/diziler' },
  { id: 'filmler', label: 'Filmler', path: '/filmler' },
  { id: 'belgeseller', label: 'Belgeseller', path: '/belgeseller' },
  { id: 'standup', label: 'Stand-up', path: '/stand-up' },
  { id: 'dikey', label: 'Dikey Diziler', path: '/dikey-diziler' },
  { id: 'gencSinema', label: 'Genç Sinema', path: '/genc-sinema' },
  { id: 'cekimNotlari', label: 'Çekim Notları', path: '/cekim-notlari' },
  { id: 'listem', label: 'Listem', path: '/listem' },
  { id: 'dergi', label: 'Dergi', path: '/dergi' },
]
