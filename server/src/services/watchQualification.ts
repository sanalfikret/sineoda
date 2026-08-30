import { normalizeContentType, type ContentType } from '../constants/contentTypes.js'

/** Genç Sinema ve kısa film: %90. Uzun metraj: %80. */
export function getWatchThreshold(contentType: ContentType | string, program?: string | null): number {
  if (program === 'student_cinema') return 0.9
  const type = normalizeContentType(contentType)
  if (type === 'kisa-film') return 0.9
  return 0.8
}

export function isQualifiedWatch(
  contentType: ContentType | string,
  position: number,
  duration: number,
  program?: string | null,
): boolean {
  if (duration <= 0) return false
  return position / duration >= getWatchThreshold(contentType, program)
}

export function thresholdLabel(contentType: ContentType | string, program?: string | null): string {
  const pct = Math.round(getWatchThreshold(contentType, program) * 100)
  return `%${pct}`
}
