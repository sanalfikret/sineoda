import { dbGet, dbRun } from '../db.js'

export type BuiltInLandingBlockId =
  | 'hero'
  | 'manifesto'
  | 'slider'
  | 'studentMonthlyWinners'
  | 'studentPicks'
  | 'showcases'
  | 'journal'
  | 'features'
  | 'campaign'
  | 'studentCinema'
  | 'faq'
  | 'emailSignup'
  | 'creator'

export type LandingLayoutBlockId = BuiltInLandingBlockId | `custom:${string}`

export interface LandingLayoutConfig {
  order: LandingLayoutBlockId[]
  hidden: LandingLayoutBlockId[]
}

const SETTINGS_KEY = 'landing_layout'
const CUSTOM_PREFIX = 'custom:'

const ALL_LANDING_BLOCK_IDS: BuiltInLandingBlockId[] = [
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
]

const DEFAULT_LANDING_BLOCK_ORDER: BuiltInLandingBlockId[] = [...ALL_LANDING_BLOCK_IDS]

function isBuiltInBlockId(id: string): id is BuiltInLandingBlockId {
  return ALL_LANDING_BLOCK_IDS.includes(id as BuiltInLandingBlockId)
}

function isCustomBlockId(id: string) {
  return id.startsWith(CUSTOM_PREFIX)
}

function isKnownLayoutBlockId(id: string, customBlockIds: string[]) {
  if (isBuiltInBlockId(id)) return true
  if (!isCustomBlockId(id)) return false
  return customBlockIds.includes(id.slice(CUSTOM_PREFIX.length))
}

export function normalizeLandingLayout(
  raw?: Partial<LandingLayoutConfig> | null,
  customBlockIds: string[] = [],
): LandingLayoutConfig {
  const orderInput = Array.isArray(raw?.order) ? raw.order : []
  const order: LandingLayoutBlockId[] = []

  for (const id of orderInput) {
    if (isKnownLayoutBlockId(id, customBlockIds) && !order.includes(id as LandingLayoutBlockId)) {
      order.push(id as LandingLayoutBlockId)
    }
  }

  for (const id of DEFAULT_LANDING_BLOCK_ORDER) {
    if (!order.includes(id)) order.push(id)
  }

  for (const blockId of customBlockIds) {
    const layoutId = `${CUSTOM_PREFIX}${blockId}` as LandingLayoutBlockId
    if (!order.includes(layoutId)) order.push(layoutId)
  }

  const hiddenInput = Array.isArray(raw?.hidden) ? raw.hidden : []
  const hidden: LandingLayoutBlockId[] = []
  for (const id of hiddenInput) {
    if (isKnownLayoutBlockId(id, customBlockIds) && !hidden.includes(id as LandingLayoutBlockId)) {
      hidden.push(id as LandingLayoutBlockId)
    }
  }

  return { order, hidden }
}

export function getLandingLayoutConfig(customBlockIds: string[] = []): LandingLayoutConfig {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  let raw: Partial<LandingLayoutConfig> | null = null
  if (row?.value) {
    try {
      raw = JSON.parse(row.value) as Partial<LandingLayoutConfig>
    } catch {
      raw = null
    }
  }

  const layout = normalizeLandingLayout(raw, customBlockIds)
  const rawOrder = Array.isArray(raw?.order) ? raw.order : []
  const missingCustomInStoredLayout = customBlockIds.some(
    (id) => !rawOrder.includes(`${CUSTOM_PREFIX}${id}` as LandingLayoutBlockId),
  )
  if (missingCustomInStoredLayout) {
    saveLandingLayoutConfig(layout, customBlockIds)
  }
  return layout
}

export function saveLandingLayoutConfig(raw: unknown, customBlockIds: string[] = []): LandingLayoutConfig {
  const layout = normalizeLandingLayout(raw as Partial<LandingLayoutConfig>, customBlockIds)
  dbRun(
    'INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)',
    [SETTINGS_KEY, JSON.stringify(layout)],
  )
  return layout
}
