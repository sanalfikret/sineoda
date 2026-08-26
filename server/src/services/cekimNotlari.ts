import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { slugify, mapContent, mapContentAdmin } from '../mappers.js'
import { PUBLISHED_CONTENT_SQL } from './publish.js'
import type { ContentRow } from '../types.js'

export const SHOOTING_NOTES_PROGRAM = 'shooting_notes'

export const SHOOTING_NOTES_EXCLUDE_SQL = `COALESCE(program, 'standard') != '${SHOOTING_NOTES_PROGRAM}'`

export const CEKIM_CATEGORY_PREFIX = 'cekim-'

export const CEKIM_CATEGORY_BASE_SORT = 200

export type CekimCategoryRow = {
  id: string
  title: string
  sort_order: number
  hidden: boolean
}

export function isCekimCategoryId(categoryId: string) {
  return categoryId.startsWith(CEKIM_CATEGORY_PREFIX)
}

export function isShootingNotesRow(row: Pick<ContentRow, 'program'>) {
  return (row.program ?? 'standard') === SHOOTING_NOTES_PROGRAM
}

export function listCekimNotlariCategoryRows(options?: { includeHidden?: boolean }) {
  const rows = dbAll<{ id: string; title: string; sort_order: number; hidden: number | null }>(
    `SELECT id, title, sort_order, COALESCE(hidden, 0) AS hidden FROM categories WHERE id LIKE ? ORDER BY sort_order, title`,
    [`${CEKIM_CATEGORY_PREFIX}%`],
  )
  const mapped: CekimCategoryRow[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    sort_order: row.sort_order,
    hidden: row.hidden === 1,
  }))
  if (options?.includeHidden === false) {
    return mapped.filter((row) => !row.hidden)
  }
  return mapped
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

export function updateCekimNotlariCategory(
  categoryId: string,
  updates: { title?: string; hidden?: boolean },
) {
  if (!isCekimCategoryId(categoryId)) {
    throw new Error('Geçersiz kategori.')
  }
  const existing = dbGet<{ id: string; title: string; hidden: number | null }>(
    'SELECT id, title, hidden FROM categories WHERE id = ?',
    [categoryId],
  )
  if (!existing) {
    throw new Error('Kategori bulunamadı.')
  }

  if (updates.title !== undefined) {
    const trimmed = updates.title.trim()
    if (!trimmed) {
      throw new Error('Kategori adı boş olamaz.')
    }
    dbRun('UPDATE categories SET title = ? WHERE id = ?', [trimmed, categoryId])
  }

  if (updates.hidden !== undefined) {
    dbRun('UPDATE categories SET hidden = ? WHERE id = ?', [updates.hidden ? 1 : 0, categoryId])
  }

  const row = dbGet<{ id: string; title: string; hidden: number | null }>(
    'SELECT id, title, hidden FROM categories WHERE id = ?',
    [categoryId],
  )!

  return {
    id: row.id,
    title: row.title,
    hidden: row.hidden === 1,
  }
}

/** @deprecated use updateCekimNotlariCategory */
export function updateCekimNotlariCategoryTitle(categoryId: string, title: string) {
  return updateCekimNotlariCategory(categoryId, { title })
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

export function reorderCekimNotlariCategoryItems(categoryId: string, orderedIds: string[]) {
  if (!isCekimCategoryId(categoryId)) {
    throw new Error('Geçersiz kategori.')
  }
  if (!dbGet('SELECT id FROM categories WHERE id = ?', [categoryId])) {
    throw new Error('Kategori bulunamadı.')
  }

  const existing = dbAll<{ content_id: string }>(
    'SELECT content_id FROM category_items WHERE category_id = ? ORDER BY sort_order, content_id',
    [categoryId],
  )
  const known = new Set(existing.map((row) => row.content_id))
  const unique = [...new Set(orderedIds.map(String).filter((id) => known.has(id)))]
  for (const id of known) {
    if (!unique.includes(id)) unique.push(id)
  }

  unique.forEach((contentId, index) => {
    dbRun('UPDATE category_items SET sort_order = ? WHERE category_id = ? AND content_id = ?', [
      index,
      categoryId,
      contentId,
    ])
  })

  return listAdminCekimNotlariSections()
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

function mapSection(
  category: CekimCategoryRow,
  mapper: (row: ContentRow) => ReturnType<typeof mapContent>,
) {
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
    hidden: category.hidden,
    items: rows.map(mapper),
  }
}

export function listCekimNotlariSections() {
  const categories = listCekimNotlariCategoryRows({ includeHidden: false })
  if (categories.length === 0) return []

  const rows = dbAll<ContentRow & { category_id: string }>(
    `SELECT c.*, ci.category_id
     FROM category_items ci
     INNER JOIN categories cat ON cat.id = ci.category_id
     INNER JOIN content c ON c.id = ci.content_id
     WHERE cat.id LIKE ?
       AND (cat.hidden IS NULL OR cat.hidden = 0)
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
