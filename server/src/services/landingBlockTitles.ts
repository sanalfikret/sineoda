import { dbGet, dbRun } from '../db.js'

const SETTINGS_KEY = 'landing_block_titles'

const ALL_LANDING_BLOCK_IDS = [
  'hero',
  'manifesto',
  'slider',
  'studentMonthlyWinners',
  'studentPicks',
  'showcases',
  'journal',
  'features',
  'campaign',
  'studentCinema',
  'faq',
  'emailSignup',
  'creator',
] as const

export type LandingBlockTitleId = (typeof ALL_LANDING_BLOCK_IDS)[number]
export type LandingBlockTitlesConfig = Partial<Record<LandingBlockTitleId, string>>

export function parseLandingBlockTitles(input: unknown): LandingBlockTitlesConfig {
  if (!input || typeof input !== 'object') return {}
  const result: LandingBlockTitlesConfig = {}
  for (const id of ALL_LANDING_BLOCK_IDS) {
    const value = (input as Record<string, unknown>)[id]
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed) result[id] = trimmed
  }
  return result
}

export function getLandingBlockTitlesConfig(): LandingBlockTitlesConfig {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) return {}
  try {
    return parseLandingBlockTitles(JSON.parse(row.value))
  } catch {
    return {}
  }
}

export function saveLandingBlockTitlesConfig(
  input: Partial<LandingBlockTitlesConfig> | null | undefined,
): LandingBlockTitlesConfig {
  const titles = parseLandingBlockTitles(input)
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(titles),
  ])
  return titles
}
