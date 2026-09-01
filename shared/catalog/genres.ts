/** Browse genre filters and catalog row slugs — shared by web + API. */

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
  'Klasik',
  'Spor',
] as const

export const BROWSE_GENRES = [...BROWSE_GENRES_PRIORITY, ...BROWSE_GENRES_EXTRA] as const

export type BrowseGenre = (typeof BROWSE_GENRES)[number]

/** Admin content form suggested tags (includes non-browse genres). */
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

export function genreToCategoryId(genre: string) {
  return `genre-row-${genre
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`
}
