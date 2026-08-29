import { dbGet, dbRun } from '../db.js'

import type { ContentPoolId } from '../services/contentPools.js'

export type LandingCustomBlockType = 'richText' | 'ctaBanner' | 'imageText' | 'contentRow'

export interface LandingCustomBlock {
  id: string
  adminLabel: string
  type: LandingCustomBlockType
  contentPool?: ContentPoolId
  eyebrow: string
  title: string
  body: string
  image: string
  ctaLabel: string
  ctaLink: string
  ctaSecondaryLabel: string
  ctaSecondaryLink: string
  itemIds: string[]
}

const SETTINGS_KEY = 'landing_custom_blocks'
const VALID_TYPES: LandingCustomBlockType[] = ['richText', 'ctaBanner', 'imageText', 'contentRow']
const VALID_POOLS: ContentPoolId[] = [
  'platform',
  'film',
  'dizi',
  'belgesel',
  'kisa-film',
  'vertical',
  'student_cinema',
  'shooting_notes',
]

function trim(value: unknown) {
  return String(value ?? '').trim()
}

function parseBlock(raw: unknown): LandingCustomBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Partial<LandingCustomBlock>
  const id = trim(source.id)
  if (!id) return null
  const type = VALID_TYPES.includes(source.type as LandingCustomBlockType)
    ? (source.type as LandingCustomBlockType)
    : 'richText'

  return {
    id,
    adminLabel: trim(source.adminLabel) || 'Özel bölüm',
    type,
    contentPool: VALID_POOLS.includes(source.contentPool as ContentPoolId)
      ? (source.contentPool as ContentPoolId)
      : undefined,
    eyebrow: trim(source.eyebrow),
    title: trim(source.title),
    body: trim(source.body),
    image: trim(source.image),
    ctaLabel: trim(source.ctaLabel),
    ctaLink: trim(source.ctaLink) || '/kayit',
    ctaSecondaryLabel: trim(source.ctaSecondaryLabel),
    ctaSecondaryLink: trim(source.ctaSecondaryLink),
    itemIds: Array.isArray(source.itemIds)
      ? source.itemIds.map((entry) => trim(entry)).filter(Boolean)
      : [],
  }
}

export function parseLandingCustomBlocks(raw: unknown): LandingCustomBlock[] {
  if (!Array.isArray(raw)) return []
  const blocks: LandingCustomBlock[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    const block = parseBlock(entry)
    if (!block || seen.has(block.id)) continue
    seen.add(block.id)
    blocks.push(block)
  }
  return blocks
}

export function getLandingCustomBlocks(): LandingCustomBlock[] {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) return []
  try {
    return parseLandingCustomBlocks(JSON.parse(row.value))
  } catch {
    return []
  }
}

export function saveLandingCustomBlocks(blocks: LandingCustomBlock[]): LandingCustomBlock[] {
  const parsed = parseLandingCustomBlocks(blocks)
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(parsed),
  ])
  return parsed
}
