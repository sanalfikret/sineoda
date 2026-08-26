import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { slugify, mapContent, mapContentAdmin } from '../mappers.js'
import { PUBLISHED_CONTENT_SQL } from './publish.js'
import type { ContentRow } from '../types.js'

export const SHOOTING_NOTES_PROGRAM = 'shooting_notes'

export const SHOOTING_NOTES_EXCLUDE_SQL = `COALESCE(program, 'standard') != '${SHOOTING_NOTES_PROGRAM}'`

export const CEKIM_CATEGORY_PREFIX = 'cekim-'

export const CEKIM_CATEGORY_BASE_SORT = 200

export function isCekimCategoryId(categoryId: string) {
  return categoryId.startsWith(CEKIM_CATEGORY_PREFIX)
}

export function isShootingNotesRow(row: Pick<ContentRow, 'program'>) {
  return (row.program ?? 'standard') === SHOOTING_NOTES_PROGRAM
}

export function listCekimNotlariCategoryRows() {
  return dbAll<{ id: string; title: string; sort_order: number }>(
    `SELECT id, title, sort_order FROM categories WHERE id LIKE ? ORDER BY sort_order, title`,
    [`${CEKIM_CATEGORY_PREFIX}%`],
  )
}

export function newCekimCategoryId(title: string) {
  const slug = slugify(title).replace(/^cekim-/, '')
  let id = `${CEKIM_CATEGORY_PREFIX}${slug || uuid().slice(0, 8)}`
  let counter = 1
  while (dbGet('SELECT id FROM categories WHERE id = ?', [id])) {
    id = `${CEKIM_CATEGORY_PREFIX}${slug || 'kategori'}-${counter++}`
  }
  return id
}

export function createCekimNotlariCategory(title: string) {
  const trimmed = title.trim()
  if (!trimmed) {
    throw new Error('Kategori adı zorunlu.')
  }

  const rows = listCekimNotlariCategoryRows()
  const maxOrder = rows.reduce((max, row) => Math.max(max, row.sort_order), CEKIM_CATEGORY_BASE_SORT - 1)
  const id = newCekimCategoryId(trimmed)

  dbRun('INSERT INTO categories (id, title, sort_order) VALUES (?, ?, ?)', [
    id,
    trimmed,
    maxOrder + 1,
  ])

  return { id, title: trimmed }
}

export function updateCekimNotlariCategoryTitle(categoryId: string, title: string) {
  if (!isCekimCategoryId(categoryId)) {
    throw new Error('Geçersiz kategori.')
  }
  const trimmed = title.trim()
  if (!trimmed) {
    throw new Error('Kategori adı boş olamaz.')
  }
  const existing = dbGet('SELECT id FROM categories WHERE id = ?', [categoryId])
  if (!existing) {
    throw new Error('Kategori bulunamadı.')
  }
  dbRun('UPDATE categories SET title = ? WHERE id = ?', [trimmed, categoryId])
  return { id: categoryId, title: trimmed }
}

export function reorderCekimNotlariCategories(orderedIds: string[]) {
  const known = new Set(listCekimNotlariCategoryRows().map((row) => row.id))
  const unique = [...new Set(orderedIds.map(String).filter((id) => known.has(id)))]
  for (const id of known) {
    if (!unique.includes(id)) unique.push(id)
  }

  unique.forEach((id, index) => {
    dbRun('UPDATE categories SET sort_order = ? WHERE id = ?', [
      CEKIM_CATEGORY_BASE_SORT + index,
      id,
    ])
  })

  return unique.map((id) => {
    const row = dbGet<{ id: string; title: string }>('SELECT id, title FROM categories WHERE id = ?', [id])!
    return { id: row.id, title: row.title }
  })
}

export function deleteCekimNotlariCategory(categoryId: string) {
  if (!isCekimCategoryId(categoryId)) {
    throw new Error('Geçersiz kategori.')
  }
  const itemCount = dbGet<{ count: number }>(
    'SELECT COUNT(*) AS count FROM category_items WHERE category_id = ?',
    [categoryId],
  )
  if ((itemCount?.count ?? 0) > 0) {
    throw new Error('Bu kategoride video var. Önce videoları silin veya taşıyın.')
  }
  dbRun('DELETE FROM categories WHERE id = ?', [categoryId])
}

export function addToCekimCategory(contentId: string, categoryId: string) {
  if (!isCekimCategoryId(categoryId)) {
    throw new Error('Geçersiz Çekim Notları kategorisi.')
  }
  const category = dbGet('SELECT id FROM categories WHERE id = ?', [categoryId])
  if (!category) {
    throw new Error('Kategori bulunamadı.')
  }

  dbRun('DELETE FROM category_items WHERE content_id = ?', [contentId])

  const maxOrder = dbGet<{ max_order: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM category_items WHERE category_id = ?',
    [categoryId],
  )

  dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
    categoryId,
    contentId,
    (maxOrder?.max_order ?? -1) + 1,
  ])
}

function mapSection(category: { id: string; title: string }, mapper: (row: ContentRow) => ReturnType<typeof mapContent>) {
  const rows = dbAll<ContentRow>(
    `SELECT c.*
     FROM content c
     INNER JOIN category_items ci ON ci.content_id = c.id AND ci.category_id = ?
     WHERE c.program = ?
     ORDER BY ci.sort_order, c.title`,
    [category.id, SHOOTING_NOTES_PROGRAM],
  )

  return {
    id: category.id,
    title: category.title,
    items: rows.map(mapper),
  }
}

export function listCekimNotlariSections() {
  const categories = listCekimNotlariCategoryRows()
  if (categories.length === 0) return []

  const rows = dbAll<ContentRow & { category_id: string }>(
    `SELECT c.*, ci.category_id
     FROM category_items ci
     INNER JOIN categories cat ON cat.id = ci.category_id
     INNER JOIN content c ON c.id = ci.content_id
     WHERE cat.id LIKE ?
       AND c.program = ?
       AND ${PUBLISHED_CONTENT_SQL}
     ORDER BY cat.sort_order, cat.title, ci.sort_order, c.title`,
    [`${CEKIM_CATEGORY_PREFIX}%`, SHOOTING_NOTES_PROGRAM],
  )

  const itemsByCategory = new Map<string, ReturnType<typeof mapContent>[]>()
  for (const row of rows) {
    const list = itemsByCategory.get(row.category_id) ?? []
    list.push(mapContent(row))
    itemsByCategory.set(row.category_id, list)
  }

  return categories.map((category) => ({
    id: category.id,
    title: category.title,
    items: itemsByCategory.get(category.id) ?? [],
  }))
}

export function listAdminCekimNotlariSections() {
  return listCekimNotlariCategoryRows().map((category) =>
    mapSection(category, mapContentAdmin),
  )
}

export function listAdminCekimNotlariItems() {
  return dbAll<ContentRow>(
    `SELECT c.*
     FROM content c
     WHERE c.program = ?
     ORDER BY c.title`,
    [SHOOTING_NOTES_PROGRAM],
  ).map(mapContentAdmin)
}
