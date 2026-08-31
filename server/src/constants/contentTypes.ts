export const CONTENT_TYPE_VALUES = ['film', 'dizi', 'belgesel', 'kisa-film', 'stand-up'] as const

export type ContentType = (typeof CONTENT_TYPE_VALUES)[number]

export function normalizeContentType(value: unknown, fallback: ContentType = 'film'): ContentType {
  if (typeof value === 'string' && CONTENT_TYPE_VALUES.includes(value as ContentType)) {
    return value as ContentType
  }
  return fallback
}
