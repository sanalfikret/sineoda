import { dbGet, dbRun } from '../db.js'
import { dedupeAllCategories } from './categoryDedup.js'
import { fillCategoriesToTarget } from './categoryFill.js'
import { reconcileCategoryOrder } from './categoryOrder.js'

const MAINTENANCE_KEY = 'category_maintenance_version'
/** Başlık ezme davranışı kaldırıldıktan sonraki tek seferlik bakım sürümü. */
const MAINTENANCE_VERSION = 4

function migrateStandUpContentTypes() {
  dbRun(
    `UPDATE content
     SET type = 'stand-up'
     WHERE type = 'film'
       AND (
         genres LIKE '%"Stand-up"%'
         OR genres LIKE '%Stand-up%'
       )`,
  )
}

/**
 * Sunucu açılışında kategori bakımı.
 * Admin'in kaydettiği başlık/sıra her restart'ta seed ile ezilmez.
 */
export function runStartupCategoryMaintenance() {
  migrateStandUpContentTypes()
  fillCategoriesToTarget()
  runOneTimeCategoryDedupeIfNeeded()
  reconcileCategoryOrder()
}

function runOneTimeCategoryDedupeIfNeeded() {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [
    MAINTENANCE_KEY,
  ])
  const applied = Number.parseInt(row?.value ?? '0', 10)
  if (applied >= MAINTENANCE_VERSION) return

  dedupeAllCategories()
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    MAINTENANCE_KEY,
    String(MAINTENANCE_VERSION),
  ])
}
