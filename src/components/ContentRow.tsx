import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { ContentItem } from '../types/content'
import { ContentCard } from './ContentCard'

/** Ana sayfa carousel + kategori grid ortak yatay aralık (12px) */
const BROWSE_CARD_GAP_X = 'gap-x-3'

/** Kategori listesi (Filmler vb.) dikey satır arası */
const GRID_ROW_GAP_Y = 'gap-y-20'

/** Ana sayfa carousel: satırlar arası sıkı (hover üst üste biner, ekstra pb yok) */
const CAROUSEL_SECTION_MB = 'mb-2'

/** Kategori grid sayfaları */
const GRID_TRACK_BOTTOM = 'pb-20'
const BROWSE_TRACK_PX = 'px-4 sm:px-6 lg:px-8'

interface ContentRowProps {
  title: string
  items: ContentItem[]
  onSelect: (item: ContentItem) => void
  progressMap?: Record<string, number>
  viewAllHref?: string
  prominent?: boolean
  layout?: 'landscape' | 'portrait'
  variant?: 'carousel' | 'grid'
  gridFixedWidth?: boolean
  guestMode?: boolean
}

export function ContentRow({
  title,
  items,
  onSelect,
  progressMap,
  viewAllHref,
  prominent,
  layout = 'landscape',
  variant = 'carousel',
  gridFixedWidth = false,
  guestMode = false,
}: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const isGrid = variant === 'grid'

  const scroll = (direction: 'left' | 'right') => {
    const container = rowRef.current
    if (!container) return
    const amount = direction === 'left' ? -container.clientWidth * 0.8 : container.clientWidth * 0.8
    container.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className={`relative overflow-visible ${isGrid ? 'mb-5' : CAROUSEL_SECTION_MB}`}>
      <div className="mb-2 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link to={viewAllHref} className="text-sm font-medium text-plooy-gold hover:underline">
              Tümünü gör
            </Link>
          )}
          {!isGrid && (
            <div className="hidden gap-2 sm:flex">
              <ScrollButton direction="left" onClick={() => scroll('left')} />
              <ScrollButton direction="right" onClick={() => scroll('right')} />
            </div>
          )}
        </div>
      </div>

      {isGrid ? (
        gridFixedWidth ? (
          <div className={`overflow-visible ${BROWSE_TRACK_PX} ${GRID_TRACK_BOTTOM}`}>
            <div className={`flex flex-wrap items-start overflow-visible ${BROWSE_CARD_GAP_X} ${GRID_ROW_GAP_Y}`}>
              {items.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onSelect={onSelect}
                  progressPercent={progressMap?.[item.id]}
                  size={prominent ? 'large' : 'default'}
                  layout={layout}
                  variant={variant}
                  gridFixedWidth
                  guestHref={guestMode ? '/giris' : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 sm:px-6 md:grid-cols-4 lg:grid-cols-5 lg:px-8">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onSelect={onSelect}
                progressPercent={progressMap?.[item.id]}
                size={prominent ? 'large' : 'default'}
                layout={layout}
                variant={variant}
                guestHref={guestMode ? '/giris' : undefined}
              />
            ))}
          </div>
        )
      ) : (
        <div
          ref={rowRef}
          className={`hide-scrollbar overflow-x-auto overflow-y-hidden scroll-pl-4 scroll-pr-4 ${BROWSE_TRACK_PX}`}
        >
          <div className={`flex snap-x snap-mandatory items-start overflow-visible ${BROWSE_CARD_GAP_X} pr-1`}>
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onSelect={onSelect}
                progressPercent={progressMap?.[item.id]}
                size={prominent ? 'large' : 'default'}
                layout={layout}
                variant={variant}
                guestHref={guestMode ? '/giris' : undefined}
              />
            ))}
          </div>
        </div>
      )}
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
      className="rounded-full border border-white/10 bg-plooy-elevated p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
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
