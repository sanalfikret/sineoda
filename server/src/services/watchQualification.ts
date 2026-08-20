import { normalizeContentType, type ContentType } from '../constants/contentTypes.js'

/** Uzun metraj (film, belgesel, dizi): en az %30 izlenmeli. Kısa film: %50. */
export function getWatchThreshold(contentType: ContentType | string): number {
  const type = normalizeContentType(contentType)
  if (type === 'kisa-film') return 0.5
  return 0.3
}

export function isQualifiedWatch(
  contentType: ContentType | string,
  position: number,
  duration: number,
): boolean {
  if (duration <= 0) return false
  return position / duration >= getWatchThreshold(contentType)
}

export function thresholdLabel(contentType: ContentType | string): string {
  const pct = Math.round(getWatchThreshold(contentType) * 100)
  return `%${pct}`
}
