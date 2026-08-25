import { createRandomId } from './id'
import type { FestivalEntry, FestivalEntryKind, FestivalFormat } from '../constants/festivals'

export function formatMinutesDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours}s ${mins}dk`
  if (hours > 0) return `${hours}s`
  return `${mins} dk`
}

export function resolveContentDuration(item: {
  duration?: string
  durationMinutes?: number | null
}) {
  if (item.durationMinutes && item.durationMinutes > 0) {
    return formatMinutesDuration(item.durationMinutes)
  }
  return item.duration ?? ''
}

export function createEmptyFestivalEntry(
  partial: Partial<FestivalEntry> = {},
): FestivalEntry {
  return {
    id: createRandomId(),
    festivalName: '',
    year: new Date().getFullYear(),
    kind: 'selection',
    ...partial,
  }
}

export function festivalsToForm(entries: FestivalEntry[] = []) {
  return entries.map((entry) => ({ ...entry }))
}

export function buildFestivals(entries: FestivalEntry[]): FestivalEntry[] {
  return entries
    .map((entry) => ({
      id: entry.id || createRandomId(),
      festivalName: entry.festivalName.trim(),
      year: entry.year,
      kind: entry.kind as FestivalEntryKind,
      ...(entry.awardName?.trim() ? { awardName: entry.awardName.trim() } : {}),
      ...(entry.format ? { format: entry.format as FestivalFormat } : {}),
      ...(entry.laurelUrl?.trim() ? { laurelUrl: entry.laurelUrl.trim() } : {}),
    }))
    .filter((entry) => entry.festivalName && entry.year >= 1900)
    .filter((entry) => entry.kind !== 'award' || Boolean(entry.awardName))
}

export function parseDurationMinutesInput(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed)
}
