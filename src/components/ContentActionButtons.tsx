import { type ReactNode } from 'react'
import { useWatchlist } from '../context/WatchlistContext'
import { useContentReactions } from '../hooks/useContentReactions'

interface ContentActionButtonsProps {
  contentId: string
  title: string
  showWatchlist?: boolean
  showLabels?: boolean
  variant?: 'default' | 'overlay'
  className?: string
}

export function ContentActionButtons({
  contentId,
  title,
  showWatchlist = true,
  showLabels = false,
  variant = 'default',
  className = '',
}: ContentActionButtonsProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist()
  const { reaction, reactionLoading, shareBusy, handleReaction, handleShare } =
    useContentReactions(contentId)

  const inList = isInWatchlist(contentId)
  const isOverlay = variant === 'overlay'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showWatchlist && (
        <ActionButton
          label={inList ? 'Listemde' : 'Listeme ekle'}
          active={inList}
          overlay={isOverlay}
          showLabel={showLabels}
          onClick={() => void toggleWatchlist(contentId)}
        >
          {inList ? '✓' : '+'}
        </ActionButton>
      )}

      <ActionButton
        label="Beğen"
        active={reaction === 'like'}
        disabled={reactionLoading}
        overlay={isOverlay}
        showLabel={showLabels}
        onClick={() => void handleReaction('like')}
      >
        <ThumbsUpIcon />
      </ActionButton>

      <ActionButton
        label="Beğenme"
        active={reaction === 'dislike'}
        disabled={reactionLoading}
        overlay={isOverlay}
        showLabel={showLabels}
        onClick={() => void handleReaction('dislike')}
      >
        <ThumbsDownIcon />
      </ActionButton>

      <ActionButton
        label="Paylaş"
        disabled={shareBusy}
        overlay={isOverlay}
        showLabel={showLabels}
        onClick={() => void handleShare(title)}
      >
        <ShareIcon />
      </ActionButton>
    </div>
  )
}

function ActionButton({
  label,
  active,
  disabled,
  overlay,
  showLabel,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  overlay?: boolean
  showLabel?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border transition disabled:opacity-50 ${
        showLabel ? 'px-4 py-2.5 text-sm font-medium' : 'h-11 w-11 justify-center'
      } ${
        active
          ? 'border-sineoda-gold bg-sineoda-gold/15 text-sineoda-gold'
          : overlay
            ? 'border-white/30 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60'
            : 'border-white/20 text-white hover:bg-white/10'
      }`}
    >
      {children}
      {showLabel && <span>{label}</span>}
    </button>
  )
}

function ThumbsUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 22V10M7 10l4-7 1.5 4H18a2 2 0 0 1 2 2.2l-1.2 6.8H7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ThumbsDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17 2v12M17 14l-4 7-1.5-4H6a2 2 0 0 1-2-2.2l1.2-6.8H17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.6 10.7l6.8-3.9M8.6 13.3l6.8 3.9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
