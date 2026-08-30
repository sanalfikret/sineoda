import type { DragEvent } from 'react'

interface AdminDragHandleProps {
  disabled?: boolean
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}

export function AdminDragHandle({ disabled = false, onDragStart, onDragEnd }: AdminDragHandleProps) {
  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      aria-label="Sürükleyerek sırala"
      className="cursor-grab rounded-lg border border-white/10 px-2 py-3 text-plooy-muted hover:bg-white/5 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
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
    </div>
  )
}
