import { dbAll, dbGet, dbRun } from '../db.js'
import { PUBLISHED_CONTENT_SQL } from './publish.js'
import type { ContentRow } from '../types.js'

export const ITEMS_PER_CATEGORY = 20

function parseGenres(row: ContentRow) {
  try {
    return JSON.parse(row.genres) as string[]
  } catch {
    return [] as string[]
  }
}

function matchesCategory(categoryTitle: string, categoryId: string, row: ContentRow) {
  const genres = parseGenres(row)
  const title = categoryTitle.toLocaleLowerCase('tr')
  const vertical = row.video_format === 'vertical'

  if (title === 'bu hafta trend') return Boolean(row.featured) || Boolean(row.is_new)
  if (title === 'yeni eklenenler') return Boolean(row.is_new)
  if (title === 'popüler diziler') return row.type === 'dizi' && !vertical
  if (title === 'belgeseller') return row.type === 'belgesel'
  if (title === 'dikey diziler') return vertical
  if (title === 'filmler') return row.type === 'film'
  if (title === 'kısa filmler') return row.type === 'kisa-film'
  if (title === 'aile için') return genres.some((g) => ['Aile', 'Animasyon', 'Çocuk'].includes(g))
  if (title === 'stand-up') return genres.includes('Stand-up')
  if (title === 'animasyon') return genres.includes('Animasyon')
  if (title === 'anime') return genres.includes('Anime')
  if (title === 'yerli yapımlar') return genres.includes('Yerli')
  if (title === 'suç ve gizem') return genres.some((g) => ['Suç', 'Gizem', 'Gerilim'].includes(g))
  if (title === 'romantik') return genres.includes('Romantik')
  if (title === 'bilim kurgu ve fantastik') {
    return genres.some((g) => ['Bilim Kurgu', 'Fantastik'].includes(g))
  }
  if (title === 'komedi özel') return genres.includes('Komedi')

  if (genres.includes(categoryTitle)) return true
  if (categoryId.startsWith('genre-') && title) {
    return genres.some((genre) => genre.toLocaleLowerCase('tr') === title)
  }

  return false
}

function pickItemsForCategory(
  categoryTitle: string,
  categoryId: string,
  catalog: ContentRow[],
  limit: number,
) {
  const matched = catalog.filter((row) => matchesCategory(categoryTitle, categoryId, row))
  const pool = matched.length >= limit ? matched : catalog
  return pool.slice(0, limit).map((row) => row.id)
}

function setCategoryItems(categoryId: string, itemIds: string[]) {
  dbRun('DELETE FROM category_items WHERE category_id = ?', [categoryId])
  itemIds.forEach((contentId, index) => {
    const exists = dbGet('SELECT id FROM content WHERE id = ?', [contentId])
    if (!exists) return
    dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
      categoryId,
      contentId,
      index,
    ])
  })
}

export function fillCategoriesToTarget(target = ITEMS_PER_CATEGORY) {
  const catalog = dbAll<ContentRow>(
    `SELECT * FROM content WHERE ${PUBLISHED_CONTENT_SQL} ORDER BY title`,
  )
  const categories = dbAll<{ id: string; title: string }>('SELECT id, title FROM categories')

  for (const category of categories) {
    const current = dbAll<{ content_id: string }>(
      'SELECT content_id FROM category_items WHERE category_id = ? ORDER BY sort_order',
      [category.id],
    ).map((row) => row.content_id)

    if (current.length >= target) continue

    const picks = pickItemsForCategory(category.title, category.id, catalog, target)
    const merged = [...new Set([...current, ...picks])].slice(0, target)
    if (merged.length > current.length) {
      setCategoryItems(category.id, merged)
    }
  }
}
