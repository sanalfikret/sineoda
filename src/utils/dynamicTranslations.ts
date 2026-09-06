export function localizeDynamic<T>(value: T, language: string): T {
  if (Array.isArray(value)) return value.map(v => localizeDynamic(v, language)) as T
  if (!value || typeof value !== 'object') return value
  const source = value as Record<string, unknown>
  const result = Object.fromEntries(Object.entries(source).map(([k,v]) => [k, k === 'translations' ? v : localizeDynamic(v, language)]))
  const translations = source.translations as Record<string, { title?: string; description?: string }> | undefined
  const entry = translations?.[language.startsWith('en') ? 'en' : 'tr']
  if (entry?.title) result.title = entry.title
  if (entry && typeof entry.description === 'string') result.description = entry.description
  return result as T
}
