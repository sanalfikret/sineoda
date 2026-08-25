import type { ContentCategory } from '../../types/content'

/** Sunucudan gelen kategori listesini mevcut sırayla birleştirir (yinelemeli başlıkları atlar). */
export function mergeOrderedCategories(
  current: ContentCategory[],
  incoming: ContentCategory[],
): ContentCategory[] {
  const byId = new Map(incoming.map((category) => [category.id, category]))
  const seenTitles = new Set<string>()
  const next: ContentCategory[] = []

  for (const category of current) {
    const fresh = byId.get(category.id)
    if (!fresh) continue
    const titleKey = fresh.title.trim().toLocaleLowerCase('tr')
    if (seenTitles.has(titleKey)) continue
    seenTitles.add(titleKey)
    next.push(fresh)
  }

  for (const category of incoming) {
    const titleKey = category.title.trim().toLocaleLowerCase('tr')
    if (seenTitles.has(titleKey)) continue
    if (next.some((entry) => entry.id === category.id)) continue
    seenTitles.add(titleKey)
    next.push(category)
  }

  return next
}

/** Yerel listede tek kategoriyi günceller (optimistic UI). */
export function patchCategoryInList(
  list: ContentCategory[],
  categoryId: string,
  patch: Partial<ContentCategory>,
): ContentCategory[] {
  return list.map((entry) => (entry.id === categoryId ? { ...entry, ...patch } : entry))
}
