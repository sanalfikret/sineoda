import { dbAll, dbGet, dbRun } from '../db.js'
import { CEKIM_NOTLARI_CATEGORIES } from '../constants/cekimNotlari.js'
import { mapContent, mapContentAdmin } from '../mappers.js'
import { PUBLISHED_CONTENT_SQL } from './publish.js'
import type { ContentRow } from '../types.js'

export const SHOOTING_NOTES_PROGRAM = 'shooting_notes'

export const SHOOTING_NOTES_EXCLUDE_SQL = `COALESCE(program, 'standard') != '${SHOOTING_NOTES_PROGRAM}'`

export function isShootingNotesRow(row: Pick<ContentRow, 'program'>) {
  return (row.program ?? 'standard') === SHOOTING_NOTES_PROGRAM
}

export function addToCekimCategory(contentId: string, categoryId: string) {
  const allowed = CEKIM_NOTLARI_CATEGORIES.some((entry) => entry.id === categoryId)
  if (!allowed) {
    throw new Error('Geçersiz Çekim Notları kategorisi.')
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

export function listCekimNotlariSections() {
  return CEKIM_NOTLARI_CATEGORIES.map((category) => {
    const rows = dbAll<ContentRow>(
      `SELECT c.*
       FROM content c
       INNER JOIN category_items ci ON ci.content_id = c.id AND ci.category_id = ?
       WHERE ${PUBLISHED_CONTENT_SQL}
         AND c.program = ?
       ORDER BY ci.sort_order, c.title`,
      [category.id, SHOOTING_NOTES_PROGRAM],
    )

    return {
      id: category.id,
      title: category.title,
      items: rows.map(mapContent),
    }
  })
}

export function listAdminCekimNotlariSections() {
  return CEKIM_NOTLARI_CATEGORIES.map((category) => {
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
      items: rows.map(mapContentAdmin),
    }
  })
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
