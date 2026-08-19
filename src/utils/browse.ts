import { BROWSE_GENRES, genreToCategoryId } from '../constants/genres'
import type { ContentCategory, ContentItem, ContentType } from '../types/content'

export type BrowseFilterOptions = {
  type?: ContentType | null
  genre?: string | null
  verticalOnly?: boolean
}

export type BrowseRow = {
  id: string
  title: string
  itemIds: string[]
  items: ContentItem[]
}

/** BrowsePage'de ayrı satır olarak gösterildiği için kategori listesinden çıkarılır */
export const BROWSE_EXCLUSIVE_ROW_TITLES = new Set<string>()

export const BROWSE_ITEMS_PER_ROW = 10

export function filterCatalog(catalog: ContentItem[], options: BrowseFilterOptions) {
  return catalog.filter((item) => {
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
  catalog: ContentItem[],
  getContentById: (id: string) => ContentItem | undefined,
  options: BrowseFilterOptions,
): BrowseRow | null {
  const category = categories.find((entry) => entry.title === title)
  if (!category) return null

  const filteredIds = new Set(filterCatalog(catalog, options).map((item) => item.id))
  const items = category.itemIds
    .map((id) => getContentById(id))
    .filter((item): item is ContentItem => Boolean(item && filteredIds.has(item.id)))
    .slice(0, BROWSE_ITEMS_PER_ROW)

  if (items.length === 0) return null

  return {
    id: category.id,
    title: category.title,
    itemIds: items.map((item) => item.id),
    items,
  }
}

export function buildCategoryBrowseRows(
  categories: ContentCategory[],
  catalog: ContentItem[],
  getContentById: (id: string) => ContentItem | undefined,
  options: BrowseFilterOptions,
): BrowseRow[] {
  const filteredIds = new Set(filterCatalog(catalog, options).map((item) => item.id))

  return categories
    .filter((category) => !BROWSE_EXCLUSIVE_ROW_TITLES.has(category.title))
    .map((category) => {
      const items = category.itemIds
        .map((id) => getContentById(id))
        .filter((item): item is ContentItem => Boolean(item && filteredIds.has(item.id)))
        .slice(0, BROWSE_ITEMS_PER_ROW)

      return {
        id: category.id,
        title: category.title,
        itemIds: items.map((item) => item.id),
        items,
      }
    })
    .filter((row) => row.items.length > 0)
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

export function buildBrowseRows(
  catalog: ContentItem[],
  options: BrowseFilterOptions,
  categories: ContentCategory[] = [],
  getContentById?: (id: string) => ContentItem | undefined,
) {
  if (options.genre) {
    const items = filterCatalog(catalog, options)
      .sort((a, b) => a.title.localeCompare(b.title, 'tr'))
      .slice(0, BROWSE_ITEMS_PER_ROW)
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

  if (categories.length > 0 && getContentById) {
    return buildCategoryBrowseRows(categories, catalog, getContentById, options)
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
