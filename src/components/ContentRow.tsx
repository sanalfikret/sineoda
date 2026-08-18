import { useRef } from 'react'
import type { ContentItem } from '../types/content'
import { ContentCard } from './ContentCard'

interface ContentRowProps {
  title: string
  items: ContentItem[]
  onSelect: (item: ContentItem) => void
  progressMap?: Record<string, number>
}

export function ContentRow({ title, items, onSelect, progressMap }: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    const container = rowRef.current
    if (!container) return
    const amount = direction === 'left' ? -container.clientWidth * 0.8 : container.clientWidth * 0.8
    container.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="mb-8 sm:mb-10">
      <div className="mb-3 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
        <div className="hidden gap-2 sm:flex">
          <ScrollButton direction="left" onClick={() => scroll('left')} />
          <ScrollButton direction="right" onClick={() => scroll('right')} />
        </div>
      </div>

      <div
        ref={rowRef}
        className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 sm:px-6 lg:px-8"
      >
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            onSelect={onSelect}
            progressPercent={progressMap?.[item.id]}
          />
        ))}
      </div>
    </section>
  )
}

function ScrollButton({
  direction,
  onClick,
}: {
  direction: 'left' | 'right'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={direction === 'left' ? 'Sola kaydır' : 'Sağa kaydır'}
      onClick={onClick}
      className="rounded-full border border-white/10 bg-sineoda-elevated p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {direction === 'left' ? (
          <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </button>
  )
}
