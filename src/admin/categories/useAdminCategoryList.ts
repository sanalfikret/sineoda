import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import type { ContentCategory } from '../../types/content'
import { STUDENT_MONTHLY_WINNERS_ROW_ID } from '../../utils/browse'
import { patchCategoryInList } from './mergeOrderedCategories'

interface UseAdminCategoryListOptions {
  categories: ContentCategory[]
  reorderCategories: (orderedIds: string[]) => Promise<ContentCategory[]>
}

export function useAdminCategoryList({ categories, reorderCategories }: UseAdminCategoryListOptions) {
  const [orderedCategories, setOrderedCategories] = useState<ContentCategory[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const initializedRef = useRef(false)
  const orderedRef = useRef<ContentCategory[]>([])
  const orderDirtyRef = useRef(false)
  const editingIdsRef = useRef(new Set<string>())
  const syncingIdsRef = useRef(new Set<string>())

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

    if (savingOrder || draggingId || editingIdsRef.current.size > 0 || syncingIdsRef.current.size > 0) {
      return
    }

    setOrderedCategories(categories)
  }, [categories, savingOrder, draggingId])

  const setEditingCategory = useCallback((categoryId: string, editing: boolean) => {
    if (editing) editingIdsRef.current.add(categoryId)
    else editingIdsRef.current.delete(categoryId)
  }, [])

  const patchLocalCategory = useCallback((categoryId: string, patch: Partial<ContentCategory>) => {
    syncingIdsRef.current.add(categoryId)
    setOrderedCategories((current) => patchCategoryInList(current, categoryId, patch))
  }, [])

  const finishCategorySync = useCallback((categoryId: string) => {
    syncingIdsRef.current.delete(categoryId)
  }, [])

  const moveCategory = useCallback((sourceId: string, targetId: string) => {
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
  }, [])

  const persistOrder = useCallback(
    async (next: ContentCategory[]) => {
      setOrderedCategories(next)
      setSavingOrder(true)
      setOrderError(null)
      orderDirtyRef.current = false

      try {
        await reorderCategories(
          next.map((category) => category.id).filter((id) => id !== STUDENT_MONTHLY_WINNERS_ROW_ID),
        )
      } catch (error) {
        setOrderError(error instanceof Error ? error.message : 'Sıra kaydedilemedi.')
        setOrderedCategories(categories)
      } finally {
        setSavingOrder(false)
      }
    },
    [categories, reorderCategories],
  )

  const handleDragStart = useCallback((event: DragEvent<HTMLElement>, id: string) => {
    setDraggingId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }, [])

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>, targetId: string) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (!draggingId) return
      moveCategory(draggingId, targetId)
    },
    [draggingId, moveCategory],
  )

  const handleDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    if (orderDirtyRef.current) {
      void persistOrder(orderedRef.current)
    }
  }, [persistOrder])

  const nudgeCategory = useCallback(
    (index: number, direction: -1 | 1) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= orderedCategories.length) return
      const next = [...orderedCategories]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      void persistOrder(next)
    },
    [orderedCategories, persistOrder],
  )

  const resetListFromServer = useCallback(() => {
    initializedRef.current = false
    editingIdsRef.current.clear()
    syncingIdsRef.current.clear()
  }, [])

  return {
    orderedCategories,
    draggingId,
    savingOrder,
    orderError,
    setEditingCategory,
    patchLocalCategory,
    finishCategorySync,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    nudgeCategory,
    resetListFromServer,
  }
}
