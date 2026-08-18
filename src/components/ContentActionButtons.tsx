import { type ReactNode } from 'react'
import { useWatchlist } from '../context/WatchlistContext'
import { useContentReactions } from '../hooks/useContentReactions'

interface ContentActionButtonsProps {
  contentId: string
  title: string
  showWatchlist?: boolean
  showLabels?: boolean
  className?: string
}

export function ContentActionButtons({
  contentId,
  title,
  showWatchlist = true,
  showLabels = false,
  className = '',
}: ContentActionButtonsProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist()
  const { reaction, reactionLoading, shareBusy, shareNotice, handleReaction, handleShare } =
    useContentReactions(contentId)

  const inList = isInWatchlist(contentId)

  return (
    <div className={`relative ${className}`}>
      <div
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 p-1 backdrop-blur-sm"
        role="toolbar"
        aria-label="İçerik işlemleri"
      >
        {showWatchlist && (
          <ActionButton
            label={inList ? 'Listemde' : 'Listeme ekle'}
            active={inList}
            showLabel={showLabels}
            onClick={() => void toggleWatchlist(contentId)}
          >
            <ListIcon filled={inList} />
          </ActionButton>
        )}

        <ActionButton
          label="Beğen"
          active={reaction === 'like'}
          disabled={reactionLoading}
          showLabel={showLabels}
          onClick={() => void handleReaction('like')}
        >
          <ThumbsUpIcon filled={reaction === 'like'} />
        </ActionButton>

        <ActionButton
          label="Beğenme"
          active={reaction === 'dislike'}
          disabled={reactionLoading}
          showLabel={showLabels}
          onClick={() => void handleReaction('dislike')}
        >
          <ThumbsDownIcon filled={reaction === 'dislike'} />
        </ActionButton>

        <ActionButton
          label="Paylaş"
          disabled={shareBusy}
          showLabel={showLabels}
          onClick={() => void handleShare(title)}
        >
          <ShareIcon />
        </ActionButton>
      </div>

      {shareNotice && (
        <p className="absolute left-0 top-full z-10 mt-2 whitespace-nowrap rounded-lg bg-sineoda-gold px-3 py-1.5 text-xs font-semibold text-sineoda-bg shadow-lg">
          {shareNotice}
        </p>
      )}
    </div>
  )
}

function ActionButton({
  label,
  active,
  disabled,
  showLabel,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
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
      className={`inline-flex items-center gap-2 rounded-full transition disabled:opacity-50 ${
        showLabel ? 'px-3 py-2 text-sm font-medium' : 'h-9 w-9 justify-center'
      } ${
        active
          ? 'bg-sineoda-gold/20 text-sineoda-gold'
          : 'text-white/85 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
      {showLabel && <span>{label}</span>}
    </button>
  )
}

function ListIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {filled ? (
        <>
          <path d="M5 6h14v2H5V6zm0 5h14v2H5v-2zm0 5h14v2H5v-2z" fill="currentColor" />
          <path d="M9 7l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function ThumbsUpIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path
        d="M7 22V11l4-6 1.5 3.5H18a2 2 0 0 1 2 2.1l-1.1 6.4a2 2 0 0 1-2 1.9H9.5L7 22z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ThumbsDownIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path
        d="M17 2v11l-4 6-1.5-3.5H6a2 2 0 0 1-2-2.1l1.1-6.4A2 2 0 0 1 7 7.5h8.5L17 2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0l-4 4m4-4 4 4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
