import { dbGet, dbRun } from '../db.js'

const SETTINGS_KEY = 'landing_admin_customized'

export function isLandingAdminCustomized() {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  return row?.value === '1'
}

export function markLandingAdminCustomized() {
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [SETTINGS_KEY, '1'])
}
