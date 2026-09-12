import { useRef, useState, type CSSProperties, type DragEvent, type PointerEvent, type ReactNode } from 'react'
import { useAdminLayout } from '../../utils/adminLayout'

export interface ArrangeableItem {
  id: string
  node: ReactNode
}

interface ArrangeableGridProps {
  /** Düzenin saklandığı anahtar (sayfa + blok), ör. "creators-stats" */
  layoutKey: string
  items: ArrangeableItem[]
  /** Geniş ekranda sütun sayısı; kutular en fazla bu kadar genişler */
  columns?: 2 | 3 | 4
  /** Varsayılan genişlikler (sütun) — belirtilmeyen kutu 1 sütun */
  defaultSpans?: Record<string, number>
  gapClass?: string
  className?: string
}

const GAP_PX = 16

/**
 * Kutuları fareyle tutup yerini değiştirmeye ve sağ kenarından çekip daraltıp genişletmeye izin veren ızgara.
 * Düzen admin için kalıcıdır (bkz. utils/adminLayout). Dar ekranlarda tek/iki sütun, sürükleme kapalı.
 */
export function ArrangeableGrid({ layoutKey, items, columns = 4, defaultSpans, gapClass = 'gap-4', className = '' }: ArrangeableGridProps) {
  const ids = items.map((item) => item.id)
  const layout = useAdminLayout(layoutKey, { ids, spans: defaultSpans })
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null)
  const [liveSpan, setLiveSpan] = useState<{ id: string; span: number } | null>(null)
  const armedRef = useRef(false)

  const byId = new Map(items.map((item) => [item.id, item]))
  const ordered = layout.order.map((id) => byId.get(id)).filter((item): item is ArrangeableItem => Boolean(item))

  const spanFor = (id: string) => Math.min(columns, Math.max(1, liveSpan?.id === id ? liveSpan.span : layout.spanOf(id)))

  const onDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!armedRef.current) {
      event.preventDefault()
      return
    }
    setDragId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
  const onDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!dragId || dragId === id) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    setOver({ id, after: event.clientX > rect.left + rect.width / 2 })
  }
  const onDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault()
    if (!dragId || dragId === targetId) return finishDrag()
    const next = layout.order.filter((id) => id !== dragId)
    const index = next.indexOf(targetId)
    const after = over?.id === targetId ? over.after : false
    next.splice(index + (after ? 1 : 0), 0, dragId)
    layout.setOrder(next)
    finishDrag()
  }
  const finishDrag = () => {
    setDragId(null)
    setOver(null)
    armedRef.current = false
  }

  const onResizeStart = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    const grid = gridRef.current
    const item = event.currentTarget.parentElement
    if (!grid || !item) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* bazı tarayıcılarda sentetik olaylarda desteklenmez; window dinleyicileri yeterli */
    }
    const gridRect = grid.getBoundingClientRect()
    const colWidth = (gridRect.width + GAP_PX) / columns
    const left = item.getBoundingClientRect().left
    let current = spanFor(id)
    const move = (e: globalThis.PointerEvent) => {
      const span = Math.min(columns, Math.max(1, Math.round((e.clientX - left + GAP_PX / 2) / colWidth)))
      if (span !== current) {
        current = span
        setLiveSpan({ id, span })
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setLiveSpan(null)
      if (current !== layout.spanOf(id)) layout.setSpan(id, current)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className={className}>
      <div
        ref={gridRef}
        className={`arr-grid grid grid-cols-1 sm:grid-cols-2 ${gapClass}`}
        style={{ '--cols': columns } as CSSProperties}
      >
        {ordered.map((item) => {
          const span = spanFor(item.id)
          const isOver = over?.id === item.id
          return (
            <div
              key={item.id}
              draggable
              onDragStart={(event) => onDragStart(event, item.id)}
              onDragOver={(event) => onDragOver(event, item.id)}
              onDragLeave={() => setOver((current) => (current?.id === item.id ? null : current))}
              onDrop={(event) => onDrop(event, item.id)}
              onDragEnd={finishDrag}
              className={`arr-item group relative min-w-0 [&>*:first-child]:h-full ${dragId === item.id ? 'opacity-40' : ''} ${
                isOver ? (over?.after ? 'ring-2 ring-plooy-gold/60 ring-offset-2 ring-offset-transparent' : 'ring-2 ring-emerald-400/60') : ''
              }`}
              style={{ '--span': span } as CSSProperties}
            >
              {item.node}
              <button
                type="button"
                title="Sürükleyip yerini değiştir"
                aria-label="Kutuyu taşı"
                onPointerDown={() => {
                  armedRef.current = true
                }}
                onPointerUp={() => {
                  armedRef.current = false
                }}
                className="absolute left-1.5 top-1.5 hidden h-6 w-6 cursor-grab select-none items-center justify-center rounded text-white/40 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 active:cursor-grabbing lg:flex"
              >
                <span aria-hidden className="text-sm leading-none tracking-tighter">⋮⋮</span>
              </button>
              <button
                type="button"
                title={`Genişlik: ${span} sütun — kenardan çekerek değiştir`}
                aria-label="Kutu genişliğini değiştir"
                onPointerDown={(event) => onResizeStart(event, item.id)}
                className="absolute -right-1 top-0 hidden h-full w-3 cursor-col-resize touch-none items-center justify-center opacity-0 transition group-hover:opacity-100 lg:flex"
              >
                <span aria-hidden className="h-10 w-1 rounded-full bg-plooy-gold/60" />
              </button>
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 hidden items-center justify-end gap-3 text-[11px] text-plooy-muted lg:flex">
        <span>Kutuyu ⋮⋮ tutamacından sürükleyin, sağ kenarından çekerek daraltıp genişletin.</span>
        {layout.isCustom && (
          <button type="button" onClick={layout.reset} className="text-plooy-gold hover:underline">
            Düzeni sıfırla
          </button>
        )}
      </div>
    </div>
  )
}
