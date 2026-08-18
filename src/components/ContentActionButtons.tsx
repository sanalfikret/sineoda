import { useState, type ReactNode } from 'react'
import { useWatchlist } from '../context/WatchlistContext'
import { useContentReactions } from '../hooks/useContentReactions'
import { ShareMenu } from './ShareMenu'

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
  const { isInWatchlist, toggleWatchlist, actionError, clearActionError } = useWatchlist()
  const { reaction, reactionLoading, reactionError, clearReactionError, handleReaction } =
    useContentReactions(contentId)
  const [shareOpen, setShareOpen] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const inList = isInWatchlist(contentId)
  const feedback = localError || actionError || reactionError

  const runWatchlist = async () => {
    clearActionError()
    clearReactionError()
    setLocalError(null)
    try {
      await toggleWatchlist(contentId)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Liste güncellenemedi.')
    }
  }

  const runReaction = async (next: 'like' | 'dislike') => {
    clearActionError()
    clearReactionError()
    setLocalError(null)
    await handleReaction(next)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-2.5" role="toolbar" aria-label="İçerik işlemleri">
        {showWatchlist && (
          <ClassicButton
            label={inList ? 'Listemde' : 'Listeme ekle'}
            active={inList}
            showLabel={showLabels}
            onClick={() => void runWatchlist()}
          >
            <PlusIcon active={inList} />
          </ClassicButton>
        )}

        <ClassicButton
          label="Beğen"
          active={reaction === 'like'}
          disabled={reactionLoading}
          showLabel={showLabels}
          onClick={() => void runReaction('like')}
        >
          <ThumbsUpIcon active={reaction === 'like'} />
        </ClassicButton>

        <ClassicButton
          label="Beğenme"
          active={reaction === 'dislike'}
          disabled={reactionLoading}
          showLabel={showLabels}
          onClick={() => void runReaction('dislike')}
        >
          <ThumbsDownIcon active={reaction === 'dislike'} />
        </ClassicButton>

        <ClassicButton
          label="Paylaş"
          active={shareOpen}
          showLabel={showLabels}
          onClick={() => setShareOpen((open) => !open)}
        >
          <ShareIcon />
        </ClassicButton>
      </div>

      {feedback && (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {feedback}
        </p>
      )}

      {shareOpen && (
        <ShareMenu contentId={contentId} title={title} onClose={() => setShareOpen(false)} />
      )}
    </div>
  )
}

function ClassicButton({
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
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border-2 transition disabled:opacity-50 ${
        showLabel ? 'px-4 py-2.5 text-sm font-medium' : 'h-11 w-11 justify-center'
      } ${
        active
          ? 'border-sineoda-gold bg-sineoda-gold/15 text-sineoda-gold shadow-[0_0_0_1px_rgba(232,184,74,0.35)]'
          : 'border-white/50 bg-black/55 text-white backdrop-blur-sm hover:border-white hover:bg-black/75'
      }`}
    >
      {children}
      {showLabel && <span>{label}</span>}
    </button>
  )
}

function PlusIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {active ? (
        <path
          d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  )
}

function ThumbsUpIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 22V11l3.5-5.5L12 9h5.8c1.1 0 2 .9 2 2l-1.2 7.2c-.2 1.1-1.1 1.8-2.2 1.8H9.2L7 22z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M4 22V10H2v12h2z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ThumbsDownIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M17 2v11l-3.5 5.5L12 15H6.2c-1.1 0-2-.9-2-2l1.2-7.2c.2-1.1 1.1-1.8 2.2-1.8h5.4L17 2z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M20 2v12h2V2h-2z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.4 10.8l7.2-4.1M8.4 13.2l7.2 4.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
