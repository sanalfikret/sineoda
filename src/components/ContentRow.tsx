import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ContentItem } from '../types/content'
import { useLocale } from '../i18n/LocaleContext'
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

import { useBrowseLabels } from '../i18n/useBrowseLabels'

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
  /** Misafir satırı: kart başına özel link (kayıt / tanıtım) */
  getGuestHref?: (item: ContentItem) => string
  /** Kart boyutu; 'large' = daha büyük kart */
  cardSize?: 'default' | 'large'
  /** Mobilde tek kart tam genişlik (ziyaretçi ana sayfası) */
  mobileSingle?: boolean
  /** "Tümünü gör" üstte değil, satır altında buton olarak */
  viewAllFooterOnly?: boolean
  viewAllLabel?: string
  /** Dış çerçeve zaten kenar boşluğu veriyorsa satırın kendi yatay boşluğunu kaldır */
  edgePadding?: boolean
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
  getGuestHref,
  cardSize,
  mobileSingle = false,
  viewAllFooterOnly = false,
  viewAllLabel,
  edgePadding = true,
}: ContentRowProps) {
  const { t } = useTranslation('browse')
  const { localizePath } = useLocale()
  const { translateCategory } = useBrowseLabels()
  const rowRef = useRef<HTMLDivElement>(null)
  const isGrid = variant === 'grid'
  const resolvedSize: 'default' | 'large' = cardSize ?? (prominent ? 'large' : 'default')
  const guestHrefFor = (item: ContentItem) =>
    getGuestHref ? getGuestHref(item) : guestMode ? localizePath('/giris') : undefined
  const trackPx = edgePadding ? BROWSE_TRACK_PX : 'px-0'
  const headerPx = edgePadding ? 'px-4 sm:px-6 lg:px-8' : 'px-0'

  const scroll = (direction: 'left' | 'right') => {
    const container = rowRef.current
    if (!container) return
    const amount = direction === 'left' ? -container.clientWidth * 0.8 : container.clientWidth * 0.8
    container.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section data-tv-row className={`relative overflow-visible ${isGrid ? 'mb-5' : CAROUSEL_SECTION_MB}`}>
      <div className={`mb-2 flex items-center justify-between ${headerPx}`}>
        <h2 className="text-[calc(1.125rem+2pt)] font-semibold text-white sm:text-[calc(1.25rem+2pt)]">{viewAllHref ? <Link to={localizePath(viewAllHref)}>{translateCategory(title)}</Link> : translateCategory(title)}</h2>
        <div className="flex items-center gap-2">
          {viewAllHref && !viewAllFooterOnly && (
            <Link to={localizePath(viewAllHref)} className="text-sm font-medium text-plooy-gold hover:underline">
              {t('viewAll')}
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
          <div className={`overflow-visible ${trackPx} ${GRID_TRACK_BOTTOM}`}>
            <div className={`flex flex-wrap items-start overflow-visible ${BROWSE_CARD_GAP_X} ${GRID_ROW_GAP_Y}`}>
              {items.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onSelect={onSelect}
                  progressPercent={progressMap?.[item.id]}
                  size={resolvedSize}
                  layout={layout}
                  variant={variant}
                  gridFixedWidth
                  guestHref={guestHrefFor(item)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 ${edgePadding ? 'px-4 sm:px-6 lg:px-8' : ''}`}>
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onSelect={onSelect}
                progressPercent={progressMap?.[item.id]}
                size={resolvedSize}
                layout={layout}
                variant={variant}
                guestHref={guestHrefFor(item)}
              />
            ))}
          </div>
        )
      ) : (
        <div
          ref={rowRef}
          className={`hide-scrollbar overflow-x-auto overflow-y-hidden ${edgePadding ? 'scroll-pl-4 scroll-pr-4' : ''} ${trackPx}`}
        >
          <div className={`flex snap-x snap-mandatory items-start overflow-visible ${BROWSE_CARD_GAP_X} pr-1`}>
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onSelect={onSelect}
                progressPercent={progressMap?.[item.id]}
                size={resolvedSize}
                layout={layout}
                variant={variant}
                guestHref={guestHrefFor(item)}
                mobileSingle={mobileSingle}
              />
            ))}
          </div>
        </div>
      )}

      {viewAllHref && viewAllFooterOnly && (
        <div className={`mt-4 text-center ${headerPx}`}>
          <Link
            to={localizePath(viewAllHref)}
            className="inline-flex items-center justify-center rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 px-5 py-2.5 text-sm font-semibold text-plooy-gold transition hover:bg-plooy-gold/20"
          >
            {viewAllLabel?.trim() || t('viewAll')}
          </Link>
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
  const { t } = useTranslation('browse')

  return (
    <button
      type="button"
      aria-label={direction === 'left' ? t('scrollLeft') : t('scrollRight')}
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
