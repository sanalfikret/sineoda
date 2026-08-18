import type { ContentItem, SearchFilters } from '../types/content'

export function normalizeSearchText(text: string) {
  return text
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim()
}

function matchesSubsequence(needle: string, haystack: string) {
  if (!needle) return true
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index += 1
    if (index === needle.length) return true
  }
  return index === needle.length
}

/** "kap krg" gibi kısaltılmış aramaları "Kalp Kırığı" ile eşleştirir */
export function fuzzySearchMatch(query: string, ...fields: string[]) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true

  const compactQuery = normalizedQuery.replace(/\s+/g, '')
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean)
  const target = fields.map((field) => normalizeSearchText(field)).join(' ')
  const compactTarget = target.replace(/\s+/g, '')
  const targetWords = target.split(/\s+/).filter(Boolean)

  if (compactTarget.includes(compactQuery)) return true
  if (target.includes(normalizedQuery)) return true
  if (matchesSubsequence(compactQuery, compactTarget)) return true

  return queryWords.every((word) => {
    const compactWord = word.replace(/\s+/g, '')
    if (target.includes(word) || compactTarget.includes(compactWord)) return true
    return targetWords.some(
      (targetWord) => matchesSubsequence(compactWord, targetWord) || targetWord.startsWith(word),
    )
  })
}

export function sortByTurkishTitle<T>(items: T[], getTitle: (item: T) => string) {
  return [...items].sort((a, b) =>
    getTitle(a).localeCompare(getTitle(b), 'tr', { sensitivity: 'base' }),
  )
}

export function getAllGenres(catalog: ContentItem[]) {
  const genres = new Set<string>()
  for (const item of catalog) {
    for (const genre of item.genres) genres.add(genre)
  }
  return [...genres].sort((a, b) => a.localeCompare(b, 'tr'))
}

export function getAllYears(catalog: ContentItem[]) {
  const years = new Set<number>()
  for (const item of catalog) years.add(item.year)
  return [...years].sort((a, b) => b - a)
}

export function searchContent(catalog: ContentItem[], filters: SearchFilters) {
  const filtered = catalog.filter((item) => {
    if (filters.type && item.type !== filters.type) return false
    if (filters.genre && !item.genres.includes(filters.genre)) return false
    if (filters.year && item.year !== filters.year) return false
    if (filters.query) {
      return fuzzySearchMatch(filters.query, item.title, item.description, item.genres.join(' '))
    }
    return true
  })
  return sortByTurkishTitle(filtered, (item) => item.title)
}
