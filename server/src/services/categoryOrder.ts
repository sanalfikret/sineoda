import { dbAll, dbGet, dbRun } from '../db.js'
import { isCekimCategoryId } from '../constants/cekimNotlari.js'
import { STUDENT_MONTHLY_WINNERS_ROW_ID } from '../../../shared/catalog/programRows.js'

const SETTINGS_KEY = 'category_order'
export { STUDENT_MONTHLY_WINNERS_ROW_ID }

function isVirtualBrowseRowId(categoryId: string) {
  return categoryId === STUDENT_MONTHLY_WINNERS_ROW_ID
}

function isMainCategoryId(categoryId: string) {
  return !isCekimCategoryId(categoryId)
}

export function loadCategoryOrder(): string[] | null {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) return null

  try {
    const parsed = JSON.parse(row.value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : null
  } catch {
    return null
  }
}

function allCategoryIds() {
  return dbAll<{ id: string }>('SELECT id FROM categories ORDER BY sort_order, title')
    .map((row) => row.id)
    .filter(isMainCategoryId)
}

/** Admin sıralamasını tüm kategori kimliklerini kapsayacak şekilde tamamla. */
export function normalizeCategoryOrder(orderedIds: string[]) {
  const unique = [...new Set(orderedIds.map(String).filter(Boolean))]
  const known = new Set(unique)

  for (const id of allCategoryIds()) {
    if (!known.has(id)) {
      unique.push(id)
      known.add(id)
    }
  }

  return unique
}

export function removeCategoryFromOrder(categoryId: string) {
  const rows = listCategoriesOrdered()
  const next = rows.map((row) => row.id).filter((id) => id !== categoryId)
  if (next.length === rows.length) return
  saveCategoryOrder(next)
}

export function saveCategoryOrder(orderedIds: string[]) {
  const uniqueIds = normalizeCategoryOrder(orderedIds)

  let sortIndex = 0
  for (const id of uniqueIds) {
    if (isVirtualBrowseRowId(id)) continue
    dbRun('UPDATE categories SET sort_order = ? WHERE id = ?', [sortIndex, id])
    sortIndex += 1
  }

  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(uniqueIds),
  ])
}

export function appendCategoryToOrder(categoryId: string) {
  const rows = listCategoriesOrdered()
  const next = [...rows.map((row) => row.id).filter((id) => id !== categoryId), categoryId]
  saveCategoryOrder(next)
}

export function listCategoriesOrdered() {
  const rows = dbAll<{ id: string; title: string; sort_order: number; hidden?: number | null }>(
    'SELECT id, title, sort_order, hidden FROM categories',
  )

  return [...rows]
    .filter((row) => isMainCategoryId(row.id))
    .sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'tr'),
  )
}

export function mapCategoriesResponse() {
  const categories = listCategoriesOrdered()
  const items = dbAll<{ category_id: string; content_id: string; sort_order: number }>(
    'SELECT category_id, content_id, sort_order FROM category_items ORDER BY sort_order',
  )

  return categories.map((category) => ({
    id: category.id,
    title: category.title,
    hidden: category.hidden === 1,
    itemIds: items
      .filter((item) => item.category_id === category.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.content_id),
  }))
}

/** Eski site_settings kaydı ile sort_order çelişirse DB sırasını esas al. */
export function getCategoryOrderForBrowse(): string[] {
  const saved = loadCategoryOrder()
  const fromDb = listCategoriesOrdered().map((row) => row.id)
  if (!saved || saved.length === 0) return fromDb
  return normalizeCategoryOrder(saved)
}

export function reconcileCategoryOrder() {
  const rows = listCategoriesOrdered()
  if (rows.length === 0) return

  const fromDb = rows.map((row) => row.id)
  const saved = loadCategoryOrder()
  if (saved && saved.length > 0 && saved.join('|') === fromDb.join('|')) return

  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(fromDb),
  ])
}
