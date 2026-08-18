export const CONTENT_TYPES = [
  { value: 'film', label: 'Film' },
  { value: 'dizi', label: 'Dizi' },
  { value: 'belgesel', label: 'Belgesel' },
  { value: 'kisa-film', label: 'Kısa Film' },
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]['value']

export function getContentTypeLabel(type: ContentType | string): string {
  return CONTENT_TYPES.find((entry) => entry.value === type)?.label ?? type
}

export function isSeriesContent(type: ContentType | string): boolean {
  return type === 'dizi'
}

export function isValidContentType(value: unknown): value is ContentType {
  return typeof value === 'string' && CONTENT_TYPES.some((entry) => entry.value === value)
}
