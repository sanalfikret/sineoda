/** Ana sayfa tür filtreleri ve katalog satırları — öncelik sırası */
export const BROWSE_GENRES_PRIORITY = [
  'Aksiyon',
  'Dram',
  'Suç',
  'Gerilim',
  'Komedi',
  'Romantik',
  'Aile',
  'Belgesel',
  'Gizem',
  'Stand-up',
  'Din Temalı',
] as const

export const BROWSE_GENRES_EXTRA = [
  'Korku',
  'Bilim Kurgu',
  'Fantastik',
  'Macera',
  'Animasyon',
  'Anime',
  'Müzikal',
  'Reality',
  'Yerli',
  'Spor',
] as const

export const BROWSE_GENRES = [...BROWSE_GENRES_PRIORITY, ...BROWSE_GENRES_EXTRA] as const

/** Admin içerik formunda önerilen tüm tür etiketleri */
export const CONTENT_GENRES = [
  ...BROWSE_GENRES,
  'Yemek',
  'Tarih',
  'Noir',
  'Dikey',
  'Dizi',
  'Biyografi',
  'Savaş',
  'Western',
  'Kısa Film',
  'Doğa',
] as const

export type BrowseGenre = (typeof BROWSE_GENRES)[number]

export function genreToCategoryId(genre: string) {
  return `genre-row-${genre
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`
}

export const STREAM_PROVIDERS = [
  { id: 'mux', label: 'Mux' },
  { id: 'cloudflare', label: 'Cloudflare Stream' },
  { id: 'bunny', label: 'Bunny.net' },
  { id: 'vimeo', label: 'Vimeo' },
  { id: 'custom', label: 'Özel URL / CDN' },
] as const

export type StreamProvider = (typeof STREAM_PROVIDERS)[number]['id']

/** Editöryal katalog satırları (Netflix / Disney+ tarzı) */
export const EDITORIAL_CATEGORY_LABELS = [
  'Bu Hafta Trend',
  'Yeni Eklenenler',
  'Popüler Diziler',
  'Belgeseller',
  'Stand-up',
  'Aile Filmleri',
  'Anime + Animasyon',
  'Dikey Diziler',
  'Yerli Yapımlar',
  'Suç-Gizem',
  'Romantik',
  'Bilim Kurgu ve Fantastik',
  'Komedi Filmleri',
] as const
