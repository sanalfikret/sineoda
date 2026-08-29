import {
  ALL_LANDING_BLOCK_IDS,
  LANDING_BLOCK_LABELS,
  type BuiltInLandingBlockId,
} from './landingLayout'

export type LandingBlockTitlesConfig = Partial<Record<BuiltInLandingBlockId, string>>

export const LANDING_PUBLIC_ROW_TITLE_DEFAULTS: Partial<Record<BuiltInLandingBlockId, string>> = {
  studentPicks: 'Ayın Genç Sinema Seçkileri',
  studentMonthlyWinners: 'Ayın Genç Sinema Birincileri',
}

export const LANDING_BLOCKS_WITH_PUBLIC_ROW_TITLE: BuiltInLandingBlockId[] = [
  'studentPicks',
  'studentMonthlyWinners',
]

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

export function resolveBlockAdminLabel(
  id: BuiltInLandingBlockId,
  blockTitles: LandingBlockTitlesConfig,
): string {
  return blockTitles[id]?.trim() || LANDING_BLOCK_LABELS[id]
}

export function resolvePublicRowTitle(
  id: 'studentPicks' | 'studentMonthlyWinners',
  blockTitles: LandingBlockTitlesConfig,
): string {
  return blockTitles[id]?.trim() || LANDING_PUBLIC_ROW_TITLE_DEFAULTS[id] || LANDING_BLOCK_LABELS[id]
}
