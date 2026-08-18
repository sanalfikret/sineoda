import { dbGet } from './db.js'
import { ensureDemoContentById } from './demoCatalog.js'
import { ensureGenreContentById } from './genreCatalog.js'

export function ensureContentById(contentId: string): boolean {
  if (dbGet('SELECT id FROM content WHERE id = ?', [contentId])) return true
  if (ensureGenreContentById(contentId)) return true
  if (ensureDemoContentById(contentId)) return true
  return false
}
