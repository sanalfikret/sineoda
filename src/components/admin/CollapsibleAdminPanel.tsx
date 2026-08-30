import type { DragEvent, ReactNode } from 'react'

export function CollapsibleAdminPanel({
  title,
  subtitle,
  expanded,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  hidden = false,
  onToggleHidden,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  panelId,
  children,
}: {
  title: string
  subtitle?: string
  expanded: boolean
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  hidden?: boolean
  onToggleHidden?: () => void
  draggable?: boolean
  isDragging?: boolean
  onDragStart?: (event: DragEvent<HTMLElement>) => void
  onDragOver?: (event: DragEvent<HTMLElement>) => void
  onDrop?: (event: DragEvent<HTMLElement>) => void
  onDragEnd?: () => void
  panelId?: string
  children: ReactNode
}) {
  return (
    <section
      id={panelId}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`rounded-2xl border bg-[#11141c] transition ${
        isDragging
          ? 'border-plooy-gold/50 opacity-70'
          : hidden
            ? 'border-white/5 opacity-70'
            : 'border-white/10'
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        {draggable && (
          <button
            type="button"
            aria-label="Sürükleyerek sırala"
            className="cursor-grab rounded-lg border border-white/10 px-2 py-3 text-plooy-muted hover:bg-white/5 active:cursor-grabbing"
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
        )}

        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-label="Yukarı taşı"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="rounded border border-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Aşağı taşı"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="rounded border border-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-30"
          >
            ↓
          </button>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="shrink-0 text-white/60">{expanded ? '▼' : '▶'}</span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{title}</p>
            {subtitle && <p className="truncate text-xs text-plooy-muted">{subtitle}</p>}
          </div>
        </button>

        {onToggleHidden && (
          <button
            type="button"
            onClick={onToggleHidden}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs transition ${
              hidden
                ? 'border-plooy-gold/40 text-plooy-gold hover:bg-plooy-gold/10'
                : 'border-white/10 text-white/70 hover:bg-white/5'
            }`}
          >
            {hidden ? 'Göster' : 'Gizle'}
          </button>
        )}
      </div>

      {expanded && <div className="border-t border-white/10 px-5 pb-5 pt-4">{children}</div>}
    </section>
  )
}
