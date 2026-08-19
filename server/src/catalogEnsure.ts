import { dbGet, dbRun } from './db.js'
import { ensureDemoContentById } from './demoCatalog.js'
import { ensureGenreContentById } from './genreCatalog.js'

export function ensureContentById(contentId: string): boolean {
  const exists = dbGet('SELECT id FROM content WHERE id = ?', [contentId])
  if (exists) {
    dbRun(
      `UPDATE content SET published_at = COALESCE(published_at, datetime('now')) WHERE id = ?`,
      [contentId],
    )
    return true
  }
  if (ensureGenreContentById(contentId)) {
    dbRun(
      `UPDATE content SET published_at = COALESCE(published_at, datetime('now')) WHERE id = ?`,
      [contentId],
    )
    return true
  }
  if (ensureDemoContentById(contentId)) {
    dbRun(
      `UPDATE content SET published_at = COALESCE(published_at, datetime('now')) WHERE id = ?`,
      [contentId],
    )
    return true
  }
  return false
}
