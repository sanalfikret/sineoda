import { dbGet, dbRun } from '../db.js'

export type LandingBlockId =
  | 'hero'
  | 'manifesto'
  | 'slider'
  | 'studentPicks'
  | 'showcases'
  | 'journal'
  | 'features'
  | 'campaign'
  | 'studentCinema'
  | 'faq'
  | 'emailSignup'
  | 'creator'

export interface LandingLayoutConfig {
  order: LandingBlockId[]
  hidden: LandingBlockId[]
}

const SETTINGS_KEY = 'landing_layout'

const ALL_LANDING_BLOCK_IDS: LandingBlockId[] = [
  'hero',
  'manifesto',
  'slider',
  'studentPicks',
  'showcases',
  'journal',
  'features',
  'campaign',
  'studentCinema',
  'faq',
  'emailSignup',
  'creator',
]

const DEFAULT_LANDING_BLOCK_ORDER: LandingBlockId[] = [...ALL_LANDING_BLOCK_IDS]

export function normalizeLandingLayout(raw?: Partial<LandingLayoutConfig> | null): LandingLayoutConfig {
  const orderInput = Array.isArray(raw?.order) ? raw.order : []
  const order: LandingBlockId[] = []

  for (const id of orderInput) {
    if (ALL_LANDING_BLOCK_IDS.includes(id as LandingBlockId) && !order.includes(id as LandingBlockId)) {
      order.push(id as LandingBlockId)
    }
  }

  for (const id of DEFAULT_LANDING_BLOCK_ORDER) {
    if (!order.includes(id)) order.push(id)
  }

  const hiddenInput = Array.isArray(raw?.hidden) ? raw.hidden : []
  const hidden = hiddenInput.filter(
    (id): id is LandingBlockId =>
      ALL_LANDING_BLOCK_IDS.includes(id as LandingBlockId) && !hidden.includes(id as LandingBlockId),
  )

  return { order, hidden }
}

export function getLandingLayoutConfig(): LandingLayoutConfig {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) {
    return { order: [...DEFAULT_LANDING_BLOCK_ORDER], hidden: [] }
  }

  try {
    return normalizeLandingLayout(JSON.parse(row.value) as Partial<LandingLayoutConfig>)
  } catch {
    return { order: [...DEFAULT_LANDING_BLOCK_ORDER], hidden: [] }
  }
}

export function saveLandingLayoutConfig(raw: unknown): LandingLayoutConfig {
  const layout = normalizeLandingLayout(raw as Partial<LandingLayoutConfig>)
  dbRun(
    'INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [SETTINGS_KEY, JSON.stringify(layout)],
  )
  return layout
}
