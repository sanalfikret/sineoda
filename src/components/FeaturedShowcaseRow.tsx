import { Link } from 'react-router-dom'
import type { ContentItem } from '../types/content'
import { ContentCard } from './ContentCard'

export const FEATURED_SHOWCASE_MAX_ITEMS = 6
export const FEATURED_SHOWCASE_COLUMNS = 3

/** Misafir ana sayfa + "Ayın …" kategorileri: ortalanmış 3×2 vitrin */
export function usesFeaturedShowcaseRow(title: string, rowId?: string) {
  const normalized = title.trim()
  if (rowId === 'student-monthly-winners') return true
  if (/^Ayın /i.test(normalized)) return true
  return false
}

interface FeaturedShowcaseRowProps {
  title: string
  items: ContentItem[]
  onSelect?: (item: ContentItem) => void
  guestMode?: boolean
  viewAllHref?: string
  className?: string
  progressMap?: Record<string, number>
}

function ShowcaseCard({
  item,
  onSelect,
  guestMode,
  progressMap,
  variant,
}: {
  item: ContentItem
  onSelect?: (item: ContentItem) => void
  guestMode: boolean
  progressMap?: Record<string, number>
  variant: 'carousel' | 'grid'
}) {
  return (
    <ContentCard
      item={item}
      onSelect={onSelect ?? (() => undefined)}
      progressPercent={progressMap?.[item.id]}
      layout="landscape"
      forceLandscape
      variant={variant}
      guestHref={guestMode ? '/giris' : undefined}
    />
  )
}

export function FeaturedShowcaseRow({
  title,
  items,
  onSelect,
  guestMode = false,
  viewAllHref,
  className = '',
  progressMap,
}: FeaturedShowcaseRowProps) {
  if (items.length === 0) return null

  const visible = items.slice(0, FEATURED_SHOWCASE_MAX_ITEMS)
  const hasMore = items.length > FEATURED_SHOWCASE_MAX_ITEMS
  const loginHref = guestMode ? '/giris' : viewAllHref
  const showMoreLink = guestMode || Boolean(viewAllHref && hasMore)

  return (
    <section className={`overflow-hidden px-4 py-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="whitespace-pre-line text-lg font-semibold text-white sm:text-xl">{title}</h2>
          {loginHref && (guestMode || hasMore) && (
            <Link to={loginHref} className="shrink-0 text-sm font-medium text-sineoda-gold hover:underline">
              Tümünü gör
            </Link>
          )}
        </div>

        {/* Mobil: alt alta tam genişlik kartlar */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {visible.map((item) => (
            <ShowcaseCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              guestMode={guestMode}
              progressMap={progressMap}
              variant="grid"
            />
          ))}
        </div>

        {/* Tablet+ : 2 sütun, geniş ekranda 3 sütun vitrin */}
        <div className="hidden gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
          {visible.map((item) => (
            <ShowcaseCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              guestMode={guestMode}
              progressMap={progressMap}
              variant="grid"
            />
          ))}
        </div>

        {showMoreLink && loginHref && (
          <div className="mt-6 text-center">
            <Link
              to={loginHref}
              className="inline-flex items-center justify-center rounded-lg border border-sineoda-gold/40 bg-sineoda-gold/10 px-5 py-2.5 text-sm font-semibold text-sineoda-gold transition hover:bg-sineoda-gold/20"
            >
              {guestMode ? 'Daha fazlasını görmek için giriş yap' : 'Tümünü gör'}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
