import { dbAll, dbGet, dbRun } from '../db.js'
import { matchesEditorialFillRule } from '../editorialCategories.js'
import { PUBLISHED_CONTENT_SQL } from './publish.js'
import { GENC_SINEMA_CATEGORY_ID, MAIN_CATALOG_SQL, STANDARD_PROGRAM_SQL } from './studentCinema.js'
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
  if ((row.program ?? 'standard') === 'student_cinema') return false
  if ((row.program ?? 'standard') === 'shooting_notes') return false
  if ((row.content_format ?? 'main') !== 'main') return false

  const genres = parseGenres(row)
  const editorialMatch = matchesEditorialFillRule(categoryTitle, row, genres)
  if (editorialMatch !== null) return editorialMatch

  const title = categoryTitle.toLocaleLowerCase('tr')
  if (title === 'filmler') return row.type === 'film'
  if (title === 'kısa filmler') return row.type === 'kisa-film'

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
    `SELECT * FROM content WHERE ${PUBLISHED_CONTENT_SQL} AND ${STANDARD_PROGRAM_SQL} AND ${MAIN_CATALOG_SQL} ORDER BY title`,
  )
  const categories = dbAll<{ id: string; title: string }>(
    `SELECT id, title FROM categories WHERE id != ? AND id NOT LIKE 'cekim-%'`,
    [GENC_SINEMA_CATEGORY_ID],
  )

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
