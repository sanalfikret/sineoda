import { dbAll, dbGet, dbRun } from '../db.js'

const SETTINGS_KEY = 'category_order'

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

export function removeCategoryFromOrder(categoryId: string) {
  const customOrder = loadCategoryOrder()
  if (!customOrder?.length) return
  const next = customOrder.filter((id) => id !== categoryId)
  if (next.length === customOrder.length) return
  saveCategoryOrder(next)
}

export function saveCategoryOrder(orderedIds: string[]) {
  const uniqueIds = [...new Set(orderedIds.map(String))]
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(uniqueIds),
  ])

  uniqueIds.forEach((id, index) => {
    dbRun('UPDATE categories SET sort_order = ? WHERE id = ?', [index, id])
  })

  const known = new Set(uniqueIds)
  const remaining =
    uniqueIds.length > 0
      ? dbAll<{ id: string }>(
          `SELECT id FROM categories WHERE id NOT IN (${uniqueIds.map(() => '?').join(',')})`,
          uniqueIds,
        )
      : dbAll<{ id: string }>('SELECT id FROM categories')

  let nextOrder = uniqueIds.length
  for (const row of remaining) {
    if (known.has(row.id)) continue
    dbRun('UPDATE categories SET sort_order = ? WHERE id = ?', [nextOrder++, row.id])
  }
}

export function listCategoriesOrdered() {
  const rows = dbAll<{ id: string; title: string; sort_order: number }>(
    'SELECT id, title, sort_order FROM categories',
  )
  const customOrder = loadCategoryOrder()

  if (!customOrder?.length) {
    return [...rows].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'tr'))
  }

  const byId = new Map(rows.map((row) => [row.id, row]))
  const ordered: typeof rows = []

  for (const id of customOrder) {
    const row = byId.get(id)
    if (row) {
      ordered.push(row)
      byId.delete(id)
    }
  }

  const rest = [...byId.values()].sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'tr'),
  )

  return [...ordered, ...rest]
}

export function mapCategoriesResponse() {
  const categories = listCategoriesOrdered()
  const items = dbAll<{ category_id: string; content_id: string; sort_order: number }>(
    'SELECT category_id, content_id, sort_order FROM category_items ORDER BY sort_order',
  )

  return categories.map((category) => ({
    id: category.id,
    title: category.title,
    itemIds: items
      .filter((item) => item.category_id === category.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.content_id),
  }))
}
