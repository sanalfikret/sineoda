import { v4 as uuid } from 'uuid'

export type FestivalEntryKind = 'selection' | 'award'
export type FestivalFormat = 'short' | 'feature' | 'documentary'

export interface FestivalEntry {
  id: string
  festivalName: string
  year: number
  kind: FestivalEntryKind
  awardName?: string
  format?: FestivalFormat
  laurelUrl?: string
}

const VALID_KINDS = new Set<FestivalEntryKind>(['selection', 'award'])
const VALID_FORMATS = new Set<FestivalFormat>(['short', 'feature', 'documentary'])

function trim(value: unknown) {
  return String(value ?? '').trim()
}

export function normalizeFestivalEntry(raw: unknown): FestivalEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  const festivalName = trim(input.festivalName ?? input.festival_name)
  if (!festivalName) return null

  const year = Number(input.year)
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null

  const kindRaw = trim(input.kind ?? input.type) as FestivalEntryKind
  const kind: FestivalEntryKind = VALID_KINDS.has(kindRaw) ? kindRaw : 'selection'

  const awardName = trim(input.awardName ?? input.award_name)
  if (kind === 'award' && !awardName) return null

  const formatRaw = trim(input.format) as FestivalFormat
  const format = VALID_FORMATS.has(formatRaw) ? formatRaw : undefined

  const laurelUrl = trim(input.laurelUrl ?? input.laurel_url)

  return {
    id: trim(input.id) || uuid(),
    festivalName,
    year,
    kind,
    ...(awardName ? { awardName } : {}),
    ...(format ? { format } : {}),
    ...(laurelUrl ? { laurelUrl } : {}),
  }
}

export function parseFestivals(value?: string | null): FestivalEntry[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeFestivalEntry)
      .filter((entry): entry is FestivalEntry => Boolean(entry))
  } catch {
    return []
  }
}

export function serializeFestivals(entries: unknown) {
  if (!Array.isArray(entries)) return '[]'
  const cleaned = entries
    .map(normalizeFestivalEntry)
    .filter((entry): entry is FestivalEntry => Boolean(entry))
  return JSON.stringify(cleaned)
}

export function parseFestivalsBody(body: Record<string, unknown>) {
  if (body.festivals === undefined) return undefined
  return parseFestivals(serializeFestivals(body.festivals))
}
