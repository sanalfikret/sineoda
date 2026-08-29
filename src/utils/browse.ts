import { BROWSE_GENRES, genreToCategoryId } from '../constants/genres'
import { getContentTypeLabel } from '../constants/contentTypes'
import { BRAND_STUDENT_CINEMA } from '../constants/brand'
import { isCekimCategoryId } from '../constants/cekimNotlari'
import type { ContentCategory, ContentItem, ContentType } from '../types/content'
import { isContentAllowedForKids } from './contentRating'

export const STUDENT_MONTHLY_WINNERS_ROW_ID = 'student-monthly-winners'
export const STUDENT_MONTHLY_WINNERS_ROW_TITLE = 'Ayın Genç Sinema Birincileri'

export type BrowseFilterOptions = {
  type?: ContentType | null
  genre?: string | null
  verticalOnly?: boolean
  kidsSafe?: boolean
  excludeStudent?: boolean
  studentOnly?: boolean
  cekimNotlariOnly?: boolean
}

export type BrowseRow = {
  id: string
  title: string
  itemIds: string[]
  items: ContentItem[]
}

export type BrowseRowExtras = {
  studentCinemaPicks?: ContentItem[]
  studentCinemaMonthlyWinners?: ContentItem[]
}

function categoryFilterOptions(category: ContentCategory, options: BrowseFilterOptions): BrowseFilterOptions {
  if (category.id === BRAND_STUDENT_CINEMA.id) {
    return { ...options, excludeStudent: false, genre: null, type: null }
  }
  return options
}

function itemAllowedInCategory(category: ContentCategory, item: ContentItem, options: BrowseFilterOptions) {
  if (category.id === BRAND_STUDENT_CINEMA.id) {
    return item.program === 'student_cinema' && (item.contentFormat ?? 'main') === 'main'
  }
  return filterCatalog([item], options).length > 0
}

export const BROWSE_ITEMS_PER_ROW = 20

export function filterCatalog(catalog: ContentItem[], options: BrowseFilterOptions) {
  return catalog.filter((item) => {
    if (options.studentOnly) {
      return item.program === 'student_cinema' && (item.contentFormat ?? 'main') === 'main'
    }
    if (options.excludeStudent !== false && item.program === 'student_cinema') return false
    if (item.program === 'shooting_notes') return false
    if (options.kidsSafe && !isContentAllowedForKids(item.rating)) return false
    if (options.verticalOnly && item.videoFormat !== 'vertical') return false
    if (!options.verticalOnly && item.videoFormat === 'vertical') return false
    if (options.type && item.type !== options.type) return false
    if (options.genre && !item.genres.includes(options.genre)) return false
    return true
  })
}

export function pickCategoryRow(
  categories: ContentCategory[],
  title: string,
  _catalog: ContentItem[],
  getContentById: (id: string) => ContentItem | undefined,
  options: BrowseFilterOptions,
): BrowseRow | null {
  const category = categories.find((entry) => entry.title === title)
  if (!category) return null

  const rowOptions = categoryFilterOptions(category, options)
  const items = category.itemIds
    .map((id) => getContentById(id))
    .filter((item): item is ContentItem => Boolean(item && itemAllowedInCategory(category, item, rowOptions)))
    .slice(0, BROWSE_ITEMS_PER_ROW)

  if (items.length === 0) return null

  return {
    id: category.id,
    title: category.title,
    itemIds: items.map((item) => item.id),
    items,
  }
}

function buildMonthlyWinnersBrowseRow(extras?: BrowseRowExtras): BrowseRow | null {
  const winners = extras?.studentCinemaMonthlyWinners?.slice(0, BROWSE_ITEMS_PER_ROW) ?? []
  if (winners.length === 0) return null

  return {
    id: STUDENT_MONTHLY_WINNERS_ROW_ID,
    title: STUDENT_MONTHLY_WINNERS_ROW_TITLE,
    itemIds: winners.map((item) => item.id),
    items: winners,
  }
}

export function buildCategoryBrowseRows(
  categories: ContentCategory[],
  _catalog: ContentItem[],
  getContentById: (id: string) => ContentItem | undefined,
  options: BrowseFilterOptions,
  extras?: BrowseRowExtras,
): BrowseRow[] {
  const rows: BrowseRow[] = []

  for (const category of categories) {
    if (category.hidden) continue
    if (!options.cekimNotlariOnly && isCekimCategoryId(category.id)) continue

    const rowOptions = categoryFilterOptions(category, options)
    let items = category.itemIds
      .map((id) => getContentById(id))
      .filter((item): item is ContentItem =>
        Boolean(item && itemAllowedInCategory(category, item, rowOptions)),
      )
      .slice(0, BROWSE_ITEMS_PER_ROW)

    if (category.id === BRAND_STUDENT_CINEMA.id && items.length === 0 && extras?.studentCinemaPicks?.length) {
      items = extras.studentCinemaPicks.slice(0, BROWSE_ITEMS_PER_ROW)
    }

    if (items.length === 0) continue

    rows.push({
      id: category.id,
      title: category.title,
      itemIds: items.map((item) => item.id),
      items,
    })
  }

  return rows
}

export function buildGenreBrowseRows(
  catalog: ContentItem[],
  options: BrowseFilterOptions,
): BrowseRow[] {
  return BROWSE_GENRES.map((genre) => ({
    id: genreToCategoryId(genre),
    title: genre,
    itemIds: [] as string[],
    items: filterCatalog(catalog, { ...options, genre }).slice(0, BROWSE_ITEMS_PER_ROW),
  })).filter((row) => row.items.length > 0)
}

function typeBrowseTitle(type: ContentType) {
  switch (type) {
    case 'dizi':
      return 'Tüm Diziler'
    case 'film':
      return 'Tüm Filmler'
    case 'belgesel':
      return 'Tüm Belgeseller'
    case 'kisa-film':
      return 'Tüm Kısa Filmler'
    default:
      return `Tüm ${getContentTypeLabel(type)}`
  }
}

function buildAllTypeBrowseRow(catalog: ContentItem[], options: BrowseFilterOptions): BrowseRow[] {
  const items = filterCatalog(catalog, options).sort((a, b) => a.title.localeCompare(b.title, 'tr'))
  if (items.length === 0) return []

  const title = options.verticalOnly
    ? 'Dikey Diziler'
    : options.type
      ? typeBrowseTitle(options.type)
      : 'Tümü'

  return [
    {
      id: options.verticalOnly ? 'all-vertical' : options.type ? `all-${options.type}` : 'all',
      title,
      itemIds: items.map((item) => item.id),
      items,
    },
  ]
}

export function genresForCatalog(catalog: ContentItem[], options: BrowseFilterOptions) {
  const items = filterCatalog(catalog, { ...options, genre: null })
  const available = new Set<string>()
  for (const item of items) {
    for (const genre of item.genres) available.add(genre)
  }
  return BROWSE_GENRES.filter((genre) => available.has(genre))
}

export function buildBrowseRows(
  catalog: ContentItem[],
  options: BrowseFilterOptions,
  categories: ContentCategory[] = [],
  getContentById?: (id: string) => ContentItem | undefined,
  extras?: BrowseRowExtras,
) {
  if (options.studentOnly) {
    const items = filterCatalog(catalog, options).sort((a, b) => a.title.localeCompare(b.title, 'tr'))
    if (items.length === 0) return []
    return [
      {
        id: BRAND_STUDENT_CINEMA.id,
        title: 'Genç Sinema',
        itemIds: items.map((item) => item.id),
        items,
      },
    ]
  }

  if (options.cekimNotlariOnly && categories.length > 0 && getContentById) {
    const orderedCategories = categories.filter((category) => isCekimCategoryId(category.id))
    return buildCategoryBrowseRows(orderedCategories, catalog, getContentById, options, extras)
  }

  if (options.genre) {
    const items = filterCatalog(catalog, options).sort((a, b) => a.title.localeCompare(b.title, 'tr'))
    if (items.length === 0) return []
    return [
      {
        id: genreToCategoryId(options.genre),
        title: options.genre,
        itemIds: items.map((item) => item.id),
        items,
      },
    ]
  }

  if (options.type || options.verticalOnly) {
    return buildAllTypeBrowseRow(catalog, options)
  }

  if (categories.length > 0 && getContentById) {
    const rows = buildCategoryBrowseRows(categories, catalog, getContentById, options, extras)
    const isMainHome =
      !options.studentOnly &&
      !options.cekimNotlariOnly &&
      !options.genre &&
      !options.type &&
      !options.verticalOnly
    const monthlyRow = isMainHome ? buildMonthlyWinnersBrowseRow(extras) : null
    if (monthlyRow) {
      return [monthlyRow, ...rows.filter((row) => row.id !== STUDENT_MONTHLY_WINNERS_ROW_ID)]
    }
    return rows
  }

  return buildGenreBrowseRows(catalog, options)
}

export function pickFeatured(
  catalog: ContentItem[],
  featured: ContentItem | null,
  type?: ContentType | null,
  verticalOnly?: boolean,
) {
  const pool = verticalOnly ? catalog.filter((item) => item.videoFormat === 'vertical') : catalog
  if (!type) {
    if (verticalOnly) {
      return pool[0] ?? null
    }
    return featured ?? catalog[0] ?? null
  }
  const typed = pool.filter((item) => item.type === type)
  const featuredTyped = featured && featured.type === type && (!verticalOnly || featured.videoFormat === 'vertical') ? featured : null
  return featuredTyped ?? typed[0] ?? null
}
