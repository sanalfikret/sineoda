import { dbAll, dbGet, dbRun } from '../db.js'
import { loadCategoryOrder, saveCategoryOrder } from './categoryOrder.js'

function legacyGenreRowId(legacyId: string) {
  if (!legacyId.startsWith('genre-') || legacyId.startsWith('genre-row-')) return null
  return `genre-row-${legacyId.slice('genre-'.length)}`
}

function itemCount(categoryId: string) {
  return (
    dbGet<{ count: number }>('SELECT COUNT(*) AS count FROM category_items WHERE category_id = ?', [
      categoryId,
    ])?.count ?? 0
  )
}

function mergeCategoryItems(keepId: string, dropId: string) {
  if (keepId === dropId) return

  const dropItems = dbAll<{ content_id: string; sort_order: number }>(
    'SELECT content_id, sort_order FROM category_items WHERE category_id = ? ORDER BY sort_order',
    [dropId],
  )
  const keepItems = dbAll<{ content_id: string }>(
    'SELECT content_id FROM category_items WHERE category_id = ?',
    [keepId],
  )
  const known = new Set(keepItems.map((item) => item.content_id))
  let order = keepItems.length

  for (const item of dropItems) {
    if (known.has(item.content_id)) continue
    dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
      keepId,
      item.content_id,
      order,
    ])
    known.add(item.content_id)
    order += 1
  }

  dbRun('DELETE FROM category_items WHERE category_id = ?', [dropId])
  dbRun('DELETE FROM categories WHERE id = ?', [dropId])
}

function replaceIdInSavedOrder(oldId: string, newId: string) {
  const saved = loadCategoryOrder()
  if (!saved?.length) return
  saveCategoryOrder(saved.map((id) => (id === oldId ? newId : id)))
}

function removeIdFromSavedOrder(categoryId: string) {
  const saved = loadCategoryOrder()
  if (!saved?.length) return
  if (!saved.includes(categoryId)) return
  saveCategoryOrder(saved.filter((id) => id !== categoryId))
}

function normalizeCategoryTitle(title: string) {
  return title
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/\s+ve\s+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function findCategoryIdsByTitleAliases(aliases: readonly string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeCategoryTitle))
  const matches: string[] = []
  for (const category of dbAll<{ id: string; title: string }>('SELECT id, title FROM categories')) {
    if (normalizedAliases.has(normalizeCategoryTitle(category.title))) {
      matches.push(category.id)
    }
  }
  return matches
}

/** Eski seed kategorilerini (genre-dram) yeni satırlarla (genre-row-dram) birleştir. */
export function dedupeLegacyGenreCategories() {
  const legacyRows = dbAll<{ id: string }>(
    `SELECT id FROM categories
     WHERE id LIKE 'genre-%' AND id NOT LIKE 'genre-row-%'`,
  )

  for (const row of legacyRows) {
    const rowId = legacyGenreRowId(row.id)
    if (!rowId) continue

    const target = dbGet<{ id: string }>('SELECT id FROM categories WHERE id = ?', [rowId])
    if (!target) {
      dbRun('UPDATE categories SET id = ? WHERE id = ?', [rowId, row.id])
      replaceIdInSavedOrder(row.id, rowId)
      continue
    }

    mergeCategoryItems(rowId, row.id)
    removeIdFromSavedOrder(row.id)
  }
}

function pickKeeper(group: Array<{ id: string; title: string }>) {
  return [...group].sort((a, b) => {
    const countDiff = itemCount(b.id) - itemCount(a.id)
    if (countDiff !== 0) return countDiff
    const aScore = a.id.startsWith('genre-row-') ? 2 : a.id.startsWith('genre-') ? 1 : 0
    const bScore = b.id.startsWith('genre-row-') ? 2 : b.id.startsWith('genre-') ? 1 : 0
    return bScore - aScore
  })[0]
}

/** Aynı başlıklı kopya kategorileri birleştir (Dram x2 vb.). */
export function dedupeCategoriesByTitle() {
  const categories = dbAll<{ id: string; title: string }>('SELECT id, title FROM categories')
  const groups = new Map<string, Array<{ id: string; title: string }>>()

  for (const category of categories) {
    const key = normalizeCategoryTitle(category.title)
    const list = groups.get(key) ?? []
    list.push(category)
    groups.set(key, list)
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue
    const keeper = pickKeeper(group)
    for (const duplicate of group) {
      if (duplicate.id === keeper.id) continue
      mergeCategoryItems(keeper.id, duplicate.id)
      removeIdFromSavedOrder(duplicate.id)
    }
  }
}

type EditorialMergeRule = {
  keepId: string
  canonicalTitle: string
  dropTitleAliases: readonly string[]
  dropIds: readonly string[]
}

const EDITORIAL_MERGE_RULES: readonly EditorialMergeRule[] = [
  {
    keepId: 'local',
    canonicalTitle: 'Yerli Yapımlar',
    dropTitleAliases: ['Yerli'],
    dropIds: ['genre-row-yerli'],
  },
  {
    keepId: 'crime',
    canonicalTitle: 'Suç-Gizem',
    dropTitleAliases: ['Suç', 'Gizem', 'Suç ve Gizem', 'Suç Gizem', 'Suç-Gizem'],
    dropIds: ['genre-row-suc', 'genre-row-gizem'],
  },
  {
    keepId: 'comedy-specials',
    canonicalTitle: 'Komedi Filmleri',
    dropTitleAliases: ['Komedi', 'Komedi Özel', 'Komedi Filmleri'],
    dropIds: ['genre-row-komedi'],
  },
]

/** Editöryel satırlarla çakışan tür satırlarını birleştir. */
export function dedupeEditorialGenreOverlaps() {
  for (const rule of EDITORIAL_MERGE_RULES) {
    let keeper = dbGet<{ id: string }>('SELECT id FROM categories WHERE id = ?', [rule.keepId])
    if (!keeper) {
      const aliasIds = findCategoryIdsByTitleAliases([
        ...rule.dropTitleAliases,
        rule.canonicalTitle,
      ])
      if (aliasIds.length) {
        const candidates = aliasIds
          .map((id) => dbGet<{ id: string; title: string }>('SELECT id, title FROM categories WHERE id = ?', [id]))
          .filter((row): row is { id: string; title: string } => Boolean(row))
        const promoted = pickKeeper(candidates)
        if (promoted.id !== rule.keepId) {
          dbRun('UPDATE categories SET id = ? WHERE id = ?', [rule.keepId, promoted.id])
          replaceIdInSavedOrder(promoted.id, rule.keepId)
        }
        keeper = { id: rule.keepId }
      }
    }
    if (!keeper) continue

    const dropIds = new Set<string>(rule.dropIds)
    for (const id of findCategoryIdsByTitleAliases(rule.dropTitleAliases)) {
      dropIds.add(id)
    }

    for (const dropId of dropIds) {
      if (dropId === keeper.id) continue
      const exists = dbGet<{ id: string }>('SELECT id FROM categories WHERE id = ?', [dropId])
      if (!exists) continue
      mergeCategoryItems(keeper.id, dropId)
      removeIdFromSavedOrder(dropId)
    }

    dbRun('UPDATE categories SET title = ? WHERE id = ?', [rule.canonicalTitle, keeper.id])
  }
}

export function dedupeAllCategories() {
  dedupeLegacyGenreCategories()
  dedupeCategoriesByTitle()
  dedupeEditorialGenreOverlaps()
}
