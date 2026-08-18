import { BROWSE_GENRES, genreToCategoryId } from '../constants/genres'
import type { ContentCategory, ContentItem, ContentType } from '../types/content'

export function filterCatalog(
  catalog: ContentItem[],
  options: { type?: ContentType | null; genre?: string | null },
) {
  return catalog.filter((item) => {
    if (options.type && item.type !== options.type) return false
    if (options.genre && !item.genres.includes(options.genre)) return false
    return true
  })
}

export function buildBrowseRows(
  categories: ContentCategory[],
  catalog: ContentItem[],
  getContentById: (id: string) => ContentItem | undefined,
  options: { type?: ContentType | null; genre?: string | null },
) {
  if (options.genre) {
    const items = filterCatalog(catalog, options).sort((a, b) =>
      a.title.localeCompare(b.title, 'tr'),
    )
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

  const filteredIds = new Set(filterCatalog(catalog, options).map((item) => item.id))

  const editorialRows = categories
    .map((category) => ({
      ...category,
      items: category.itemIds
        .map((id) => getContentById(id))
        .filter((item): item is ContentItem => Boolean(item && filteredIds.has(item.id))),
    }))
    .filter((row) => row.items.length > 0)

  const genreRows = BROWSE_GENRES.map((genre) => ({
    id: genreToCategoryId(genre),
    title: genre,
    itemIds: [] as string[],
    items: filterCatalog(catalog, { ...options, genre }),
  })).filter((row) => row.items.length > 0)

  const existingTitles = new Set(editorialRows.map((row) => row.title))
  const uniqueGenreRows = genreRows.filter((row) => !existingTitles.has(row.title))

  return [...editorialRows, ...uniqueGenreRows]
}

export function pickFeatured(
  catalog: ContentItem[],
  featured: ContentItem | null,
  type?: ContentType | null,
) {
  if (!type) return featured ?? catalog[0] ?? null
  const typed = catalog.filter((item) => item.type === type)
  const featuredTyped = featured && featured.type === type ? featured : null
  return featuredTyped ?? typed[0] ?? null
}
