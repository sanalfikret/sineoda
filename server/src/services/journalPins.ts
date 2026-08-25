import { dbAll, dbGet, dbRun } from '../db.js'

const SETTINGS_KEY = 'journal_pins'
export const MAX_JOURNAL_PINS = 10

export function loadJournalPinIds(): string[] {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) return []

  try {
    const parsed = JSON.parse(row.value) as unknown
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map(String).filter(Boolean))]
  } catch {
    return []
  }
}

export function saveJournalPinIds(input: string[]): string[] {
  const unique = [...new Set(input.map(String).filter(Boolean))].slice(0, MAX_JOURNAL_PINS)
  const knownIds = new Set(
    dbAll<{ id: string }>('SELECT id FROM journal_posts').map((row) => row.id),
  )
  const next = unique.filter((id) => knownIds.has(id))

  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(next),
  ])

  return next
}

export function journalPinOrderMap(pinIds = loadJournalPinIds()) {
  return new Map(pinIds.map((id, index) => [id, index]))
}
