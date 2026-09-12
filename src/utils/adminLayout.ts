import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

/**
 * Admin kutu düzeni deposu: sıra, genişlik (sütun sayısı) ve bölme oranı.
 * Önce tarayıcı belleğinden açılır, sunucudan gelen düzen üstüne yazılır; değişiklikler
 * hemen yerel, kısa gecikmeyle sunucuya kaydedilir. Böylece admin hangi cihazdan girerse girsin aynı düzeni görür.
 */
export interface GridLayout {
  order: string[]
  spans: Record<string, number>
  split?: number
}
type LayoutMap = Record<string, GridLayout>

const LS_KEY = 'plooy_admin_layouts'
let cache: LayoutMap = readLocal()
let serverLoaded = false
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>()

function readLocal(): LayoutMap {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache))
  } catch {
    /* özel pencere vb. */
  }
}

function notify() {
  for (const fn of listeners) fn()
}

function ensureServerLayouts() {
  if (serverLoaded || loading) return loading ?? Promise.resolve()
  loading = api<{ layouts: LayoutMap }>('/api/admin/layout')
    .then((data) => {
      cache = { ...cache, ...(data.layouts ?? {}) }
      serverLoaded = true
      writeLocal()
      notify()
    })
    .catch(() => {
      /* sunucu yoksa yerel düzenle devam */
    })
    .finally(() => {
      loading = null
    })
  return loading
}

export function setAdminLayout(key: string, layout: GridLayout | null) {
  if (layout) cache = { ...cache, [key]: layout }
  else {
    const next = { ...cache }
    delete next[key]
    cache = next
  }
  writeLocal()
  notify()
  const previous = pendingSaves.get(key)
  if (previous) clearTimeout(previous)
  pendingSaves.set(
    key,
    setTimeout(() => {
      pendingSaves.delete(key)
      void api(`/api/admin/layout/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ layout }) }).catch(() => undefined)
    }, 600),
  )
}

export function useAdminLayout(
  key: string,
  defaults: { ids: string[]; spans?: Record<string, number>; split?: number },
) {
  const [, setVersion] = useState(0)
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    listeners.add(bump)
    void ensureServerLayouts()
    return () => {
      listeners.delete(bump)
    }
  }, [])

  const stored = cache[key]
  const idsKey = defaults.ids.join('|')
  const order = useMemo(() => {
    const known = new Set(defaults.ids)
    const kept = (stored?.order ?? []).filter((id) => known.has(id))
    const missing = defaults.ids.filter((id) => !kept.includes(id))
    return [...kept, ...missing]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored?.order, idsKey])

  const spanOf = useCallback(
    (id: string) => stored?.spans?.[id] ?? defaults.spans?.[id] ?? 1,
    [stored?.spans, defaults.spans],
  )
  const split = stored?.split ?? defaults.split ?? 0.6
  const isCustom = Boolean(stored)

  const commit = useCallback(
    (patch: Partial<GridLayout>) => {
      const current = cache[key] ?? { order: [...defaults.ids], spans: {} }
      setAdminLayout(key, { ...current, order: patch.order ?? (current.order.length ? current.order : [...defaults.ids]), spans: patch.spans ?? current.spans, split: patch.split ?? current.split })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, idsKey],
  )

  return {
    order,
    spanOf,
    split,
    isCustom,
    setOrder: (next: string[]) => commit({ order: next }),
    setSpan: (id: string, span: number) => commit({ spans: { ...(cache[key]?.spans ?? {}), [id]: span } }),
    setSplit: (value: number) => commit({ split: value }),
    reset: () => setAdminLayout(key, null),
  }
}
