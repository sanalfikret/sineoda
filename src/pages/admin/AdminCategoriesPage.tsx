import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { resolveMediaUrl } from '../../api/client'
import { useContent } from '../../context/ContentContext'
import type { ContentCategory } from '../../types/content'
import { fuzzySearchMatch } from '../../utils/search'

function mergeCategoryMetadata(
  current: ContentCategory[],
  incoming: ContentCategory[],
): ContentCategory[] {
  const byId = new Map(incoming.map((category) => [category.id, category]))
  const next = current.filter((category) => byId.has(category.id)).map((category) => byId.get(category.id)!)
  const known = new Set(next.map((category) => category.id))
  const added = incoming.filter((category) => !known.has(category.id))
  return [...next, ...added]
}

export function AdminCategoriesPage() {
  const { catalog, categories, addCategory, updateCategory, deleteCategory, reorderCategories, resetToSeed } =
    useContent()
  const [newTitle, setNewTitle] = useState('')
  const [orderedCategories, setOrderedCategories] = useState<ContentCategory[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [searchByCategory, setSearchByCategory] = useState<Record<string, string>>({})
  const [orderError, setOrderError] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const initializedRef = useRef(false)
  const orderedRef = useRef<ContentCategory[]>([])
  const orderDirtyRef = useRef(false)

  useEffect(() => {
    orderedRef.current = orderedCategories
  }, [orderedCategories])

  useEffect(() => {
    if (categories.length === 0) return

    if (!initializedRef.current) {
      setOrderedCategories(categories)
      initializedRef.current = true
      return
    }

    if (savingOrder || draggingId) return

    setOrderedCategories((current) => mergeCategoryMetadata(current, categories))
  }, [categories, savingOrder, draggingId])

  const catalogById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog])

  const handleAddCategory = async () => {
    if (!newTitle.trim()) return
    await addCategory(newTitle)
    setNewTitle('')
  }

  const handleDeleteCategory = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" kategorisini silmek istediğine emin misin?`)) return
    await deleteCategory(id)
  }

  const handleReset = async () => {
    if (
      !window.confirm(
        'Tüm içerik ve kategoriler varsayılan demo verisine sıfırlanacak. Emin misin?',
      )
    ) {
      return
    }
    await resetToSeed()
    initializedRef.current = false
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const moveCategory = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return null

    let nextOrder: ContentCategory[] | null = null
    setOrderedCategories((current) => {
      const sourceIndex = current.findIndex((category) => category.id === sourceId)
      const targetIndex = current.findIndex((category) => category.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current

      const next = [...current]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      nextOrder = next
      orderDirtyRef.current = true
      return next
    })
    return nextOrder
  }

  const persistOrder = async (next: ContentCategory[]) => {
    setOrderedCategories(next)
    setSavingOrder(true)
    setOrderError(null)
    orderDirtyRef.current = false

    try {
      const saved = await reorderCategories(next.map((category) => category.id))
      setOrderedCategories(saved)
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Sıra kaydedilemedi.')
      setOrderedCategories((current) => mergeCategoryMetadata(current, categories))
    } finally {
      setSavingOrder(false)
    }
  }

  const handleDragStart = (event: DragEvent<HTMLElement>, id: string) => {
    setDraggingId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const sourceId = draggingId
    if (!sourceId) return
    moveCategory(sourceId, targetId)
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    if (orderDirtyRef.current) {
      void persistOrder(orderedRef.current)
    }
  }

  const nudgeCategory = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= orderedCategories.length) return
    const next = [...orderedCategories]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    void persistOrder(next)
  }

  const updateSearch = (categoryId: string, value: string) => {
    setSearchByCategory((current) => ({ ...current, [categoryId]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Kategoriler</h1>
          <p className="mt-1 text-sm text-sineoda-muted">
            Ana sayfa satırlarını yönet. Sürükleyerek veya oklarla sırala — üyeler aynı sırayı görür.
            {savingOrder && <span className="ml-2 text-sineoda-gold">Kaydediliyor…</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleReset()}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
        >
          Demo Verisine Sıfırla
        </button>
      </div>

      {orderError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {orderError}
        </p>
      )}

      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Yeni kategori adı"
          className="flex-1 rounded-lg border border-white/10 bg-[#11141c] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold"
        />
        <button
          type="button"
          onClick={() => void handleAddCategory()}
          className="rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg"
        >
          Ekle
        </button>
      </div>

      <div className="space-y-3">
        {orderedCategories.map((category, index) => {
          const expanded = expandedIds.has(category.id)
          const search = searchByCategory[category.id] ?? ''
          const selectedItems = category.itemIds
            .map((id) => catalogById.get(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
          const addableItems = catalog.filter(
            (item) =>
              !category.itemIds.includes(item.id) &&
              fuzzySearchMatch(search, item.title, item.id, item.genres.join(' ')),
          )

          return (
            <section
              key={category.id}
              draggable={!savingOrder}
              onDragStart={(event) => handleDragStart(event, category.id)}
              onDragOver={(event) => handleDragOver(event, category.id)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`rounded-2xl border bg-[#11141c] transition ${
                draggingId === category.id
                  ? 'border-sineoda-gold/50 opacity-70'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  aria-label="Sürükleyerek sırala"
                  className="cursor-grab rounded-lg border border-white/10 px-2 py-3 text-sineoda-muted hover:bg-white/5 active:cursor-grabbing"
                  title="Sürükleyerek sırala"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="9" cy="7" r="1.5" />
                    <circle cx="15" cy="7" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="17" r="1.5" />
                    <circle cx="15" cy="17" r="1.5" />
                  </svg>
                </button>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label="Yukarı taşı"
                    disabled={index === 0 || savingOrder}
                    onClick={() => nudgeCategory(index, -1)}
                    className="rounded border border-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Aşağı taşı"
                    disabled={index === orderedCategories.length - 1 || savingOrder}
                    onClick={() => nudgeCategory(index, 1)}
                    className="rounded border border-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpanded(category.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="text-white/60">{expanded ? '▼' : '▶'}</span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">{category.title}</p>
                    <p className="text-xs text-sineoda-muted">
                      {selectedItems.length} içerik · {category.id}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => void handleDeleteCategory(category.id, category.title)}
                  className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20"
                >
                  Sil
                </button>
              </div>

              {expanded && (
                <div className="border-t border-white/10 p-4 pt-3">
                  <input
                    value={category.title}
                    onChange={(event) => updateCategory(category.id, { title: event.target.value })}
                    className="mb-4 w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-base font-semibold text-white outline-none focus:border-sineoda-gold"
                  />

                  {selectedItems.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sineoda-muted">
                        Seçili içerikler
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              updateCategory(category.id, {
                                itemIds: category.itemIds.filter((entry) => entry !== item.id),
                              })
                            }
                            className="flex items-center gap-2 rounded-full border border-sineoda-gold/30 bg-sineoda-gold/10 px-2.5 py-1 text-xs text-white hover:bg-sineoda-gold/20"
                          >
                            <img
                              src={resolveMediaUrl(item.poster)}
                              alt=""
                              className="h-5 w-3.5 rounded object-cover"
                            />
                            <span className="max-w-[140px] truncate">{item.title}</span>
                            <span className="text-white/50">×</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    value={search}
                    onChange={(event) => updateSearch(category.id, event.target.value)}
                    placeholder="İçerik ara ve ekle..."
                    className="mb-3 w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
                  />

                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {addableItems.length === 0 ? (
                      <p className="py-4 text-center text-sm text-sineoda-muted">
                        {search ? 'Eşleşen içerik yok.' : 'Tüm içerikler bu kategoride.'}
                      </p>
                    ) : (
                      addableItems.slice(0, 40).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            updateCategory(category.id, {
                              itemIds: [...category.itemIds, item.id],
                            })
                          }
                          className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-sineoda-gold/30 hover:bg-white/5"
                        >
                          <img
                            src={resolveMediaUrl(item.poster)}
                            alt=""
                            className="h-10 w-7 rounded object-cover"
                          />
                          <span className="truncate text-sm text-white/85">{item.title}</span>
                          <span className="ml-auto text-xs text-sineoda-gold">Ekle</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
