import {
  ALL_LANDING_BLOCK_IDS,
  LANDING_BLOCK_LABELS,
  type BuiltInLandingBlockId,
} from './landingLayout'

export type LandingBlockTitlesConfig = Partial<Record<BuiltInLandingBlockId, string>>

import { PROGRAM_SHOWCASE_ROWS } from '../../shared/catalog/programRows'

export const LANDING_PUBLIC_ROW_TITLE_DEFAULTS: Partial<Record<BuiltInLandingBlockId, string>> = {
  studentPicks: PROGRAM_SHOWCASE_ROWS.studentPicks.title,
  studentMonthlyWinners: PROGRAM_SHOWCASE_ROWS.studentMonthlyWinners.title,
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
