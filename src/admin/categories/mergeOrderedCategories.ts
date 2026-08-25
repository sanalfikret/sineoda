import type { ContentCategory } from '../../types/content'

/** Sunucudan gelen kategori listesini mevcut sırayla birleştirir (kimlik bazlı). */
export function mergeOrderedCategories(
  current: ContentCategory[],
  incoming: ContentCategory[],
): ContentCategory[] {
  const byId = new Map(incoming.map((category) => [category.id, category]))
  const next: ContentCategory[] = []
  const placed = new Set<string>()

  for (const category of current) {
    const fresh = byId.get(category.id)
    if (!fresh) continue
    next.push(fresh)
    placed.add(category.id)
  }

  for (const category of incoming) {
    if (placed.has(category.id)) continue
    next.push(category)
    placed.add(category.id)
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
