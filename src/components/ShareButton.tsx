import { useState } from 'react'
import { ShareMenu } from './ShareMenu'

interface ShareButtonProps {
  contentId: string
  title: string
  label?: string
  disabled?: boolean
  className?: string
}

export function ShareButton({
  contentId,
  title,
  label = 'Paylaş',
  disabled = false,
  className = '',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-emerald-400/40 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {label}
      </button>
      {open && (
        <ShareMenu contentId={contentId} title={title} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}
