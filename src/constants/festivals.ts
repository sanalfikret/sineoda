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

export const FESTIVAL_KIND_LABELS: Record<FestivalEntryKind, string> = {
  selection: 'Resmi seçki',
  award: 'Ödül',
}

export const FESTIVAL_FORMAT_LABELS: Record<FestivalFormat, string> = {
  short: 'Kısa metraj',
  feature: 'Uzun metraj',
  documentary: 'Belgesel',
}

export const FESTIVAL_PRESETS = [
  'Cannes Film Festival',
  'Berlinale',
  'Venedik Film Festivali',
  'Sundance Film Festival',
  'Locarno Film Festival',
  'Rotterdam Film Festival',
  'Antalya Altın Portakal Film Festivali',
  'İstanbul Film Festivali',
  'Ankara Uluslararası Film Festivali',
  'Adana Altın Koza Film Festivali',
  'Sarajevo Film Festivali',
  'Karlovy Vary Film Festivali',
  'Toronto Film Festivali',
  'Telluride Film Festivali',
] as const

export function festivalEntryLabel(entry: FestivalEntry) {
  const format = entry.format ? FESTIVAL_FORMAT_LABELS[entry.format] : null
  if (entry.kind === 'award') {
    return [entry.awardName, format].filter(Boolean).join(' · ')
  }
  return [FESTIVAL_KIND_LABELS.selection, format].filter(Boolean).join(' · ')
}
