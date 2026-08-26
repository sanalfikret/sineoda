import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'

interface UseAdminOrderedListOptions<T extends { id: string }> {
  items: T[]
  reorderItems: (orderedIds: string[]) => Promise<T[]>
}

export function useAdminOrderedList<T extends { id: string }>({
  items,
  reorderItems,
}: UseAdminOrderedListOptions<T>) {
  const [orderedItems, setOrderedItems] = useState<T[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const initializedRef = useRef(false)
  const orderedRef = useRef<T[]>([])
  const orderDirtyRef = useRef(false)

  useEffect(() => {
    orderedRef.current = orderedItems
  }, [orderedItems])

  useEffect(() => {
    if (items.length === 0) return

    if (!initializedRef.current) {
      setOrderedItems(items)
      initializedRef.current = true
      return
    }

    if (savingOrder || draggingId) return

    setOrderedItems(items)
  }, [items, savingOrder, draggingId])

  const moveItem = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return null

    let nextOrder: T[] | null = null
    setOrderedItems((current) => {
      const sourceIndex = current.findIndex((item) => item.id === sourceId)
      const targetIndex = current.findIndex((item) => item.id === targetId)
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
    async (next: T[]) => {
      setOrderedItems(next)
      setSavingOrder(true)
      setOrderError(null)
      orderDirtyRef.current = false

      try {
        const saved = await reorderItems(next.map((item) => item.id))
        setOrderedItems(saved)
      } catch (error) {
        setOrderError(error instanceof Error ? error.message : 'Sıra kaydedilemedi.')
        setOrderedItems(items)
      } finally {
        setSavingOrder(false)
        setDraggingId(null)
      }
    },
    [items, reorderItems],
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
      moveItem(draggingId, targetId)
    },
    [draggingId, moveItem],
  )

  const handleDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
  }, [])

  const handleDragEnd = useCallback(() => {
    if (orderDirtyRef.current) {
      void persistOrder(orderedRef.current)
      return
    }
    setDraggingId(null)
  }, [persistOrder])

  const nudgeItem = useCallback(
    (index: number, direction: -1 | 1) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= orderedItems.length) return
      const next = [...orderedItems]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      void persistOrder(next)
    },
    [orderedItems, persistOrder],
  )

  const resetListFromServer = useCallback(() => {
    initializedRef.current = false
  }, [])

  return {
    orderedItems,
    draggingId,
    savingOrder,
    orderError,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    nudgeItem,
    resetListFromServer,
  }
}
