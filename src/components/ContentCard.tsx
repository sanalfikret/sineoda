import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client'
import { getContentTypeLabel } from '../constants/contentTypes'
import type { ContentItem } from '../types/content'
import { backdropUrlForId, enrichContentImages, posterUrlForId } from '../utils/contentImages'
import { isTvDevice } from '../utils/tvDevice'

interface ContentCardProps {
  item: ContentItem
  onSelect: (item: ContentItem) => void
  progressPercent?: number
  size?: 'default' | 'large'
  layout?: 'landscape' | 'portrait'
  variant?: 'carousel' | 'grid'
  /** Kategori sayfalarında sabit kart genişliği + Netflix hover */
  gridFixedWidth?: boolean
  guestHref?: string
  /** Vitrin satırlarında dikey format etiketini yok say — yatay grid bozulmasın */
  forceLandscape?: boolean
}

const HOVER_SCALE = 1.2

/** Ana sayfa ve kategori satırlarında ortak kart genişliği */
export const CARD_WIDTH = {
  landscape: {
    /** Mobilde tam 2 kart (yarım kart yok); sm+ sabit genişlik */
    default: 'w-[calc((100vw-2.75rem)/2)] sm:w-[260px] lg:w-[280px]',
    large: 'w-[calc((100vw-2.75rem)/2)] sm:w-[300px] lg:w-[320px]',
  },
  portrait: {
    default: 'w-[calc((100vw-2.75rem)/3)] sm:w-[140px]',
    large: 'w-[calc((100vw-2.75rem)/3)] sm:w-[160px]',
  },
} as const

type HoverAnchor = {
  top: number
  left: number
  width: number
}

export function ContentCard({
  item,
  onSelect,
  progressPercent,
  size = 'default',
  layout = 'landscape',
  variant = 'carousel',
  gridFixedWidth = false,
  guestHref,
  forceLandscape = false,
}: ContentCardProps) {
  const isGrid = variant === 'grid'
  const isBrowseGrid = isGrid && gridFixedWidth
  const isPortrait = !forceLandscape && (layout === 'portrait' || item.videoFormat === 'vertical')
  const enriched = enrichContentImages(item)
  const imageUrl = resolveMediaUrl(
    isPortrait ? enriched.poster : enriched.backdrop || enriched.poster,
  )
  const fallbackUrl = isPortrait ? posterUrlForId(item.id, true) : backdropUrlForId(item.id)
  const [imageSrc, setImageSrc] = useState(imageUrl)
  const [hovered, setHovered] = useState(false)
  const [anchor, setAnchor] = useState<HoverAnchor | null>(null)
  const leaveTimerRef = useRef<number | null>(null)
  const slotRef = useRef<HTMLDivElement>(null)

  const widthClass = isBrowseGrid || !isGrid
    ? isPortrait
      ? CARD_WIDTH.portrait[size]
      : CARD_WIDTH.landscape[size]
    : 'w-full'

  const aspectClass = isPortrait ? 'aspect-[9/16]' : 'aspect-video'
  const genreLine = item.genres.slice(0, 3).join(' · ')
  const isTv = isTvDevice()
  const enableNetflixHover = !guestHref && (!isGrid || isBrowseGrid) && !isTv

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }

  const syncAnchor = useCallback(() => {
    const el = slotRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setAnchor({ top: rect.top, left: rect.left, width: rect.width })
  }, [])

  useEffect(() => () => clearLeaveTimer(), [])

  useEffect(() => {
    if (!hovered) return
    syncAnchor()
    const onMove = () => syncAnchor()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [hovered, syncAnchor])

  const handleEnter = () => {
    if (!enableNetflixHover) return
    clearLeaveTimer()
    syncAnchor()
    setHovered(true)
  }

  const handleLeave = () => {
    if (!enableNetflixHover) return
    clearLeaveTimer()
    leaveTimerRef.current = window.setTimeout(() => {
      setHovered(false)
      setAnchor(null)
    }, 200)
  }

  const badges = (
    <>
      {item.isNew && !item.monthlyAward?.enabled && (
        <span className="absolute left-2 top-2 z-10 rounded bg-plooy-gold px-2 py-0.5 text-[10px] font-bold text-plooy-bg">
          YENİ
        </span>
      )}

      {item.monthlyAward?.enabled && item.monthlyAward.badge && (
        <span className="absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] truncate rounded bg-emerald-400 px-2 py-0.5 text-[10px] font-bold text-[#07110d]">
          {item.monthlyAward.badge}
        </span>
      )}

      {item.isNew && item.monthlyAward?.enabled && (
        <span className="absolute left-2 top-8 z-10 rounded bg-plooy-gold px-2 py-0.5 text-[10px] font-bold text-plooy-bg">
          YENİ
        </span>
      )}

      {item.videoFormat === 'vertical' && (
        <span className="absolute right-2 top-2 z-10 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
          Dikey
        </span>
      )}

      {progressPercent !== undefined && progressPercent > 2 && (
        <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/20">
          <div
            className="h-full bg-plooy-gold"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      )}
    </>
  )

  const posterTitleOverlay = (hidden: boolean) => (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent px-2.5 pb-2.5 pt-10 transition-opacity duration-200 ${
        hidden ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-lg">{item.title}</p>
      {item.monthlyAward?.enabled && item.monthlyAward.prize && (
        <p className="mt-0.5 line-clamp-1 text-sm font-medium text-emerald-300">{item.monthlyAward.prize}</p>
      )}
    </div>
  )

  const hoverDetails = (
    <div className="rounded-b-md border-t border-white/10 bg-[#181818] p-3">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black shadow"
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-white/80"
          aria-hidden="true"
        >
          +
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-white/80"
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.67 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
        </span>
        <span
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-xs text-white/70"
          aria-hidden="true"
        >
          ▾
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#bcbcbc]">
        <span className="rounded border border-white/25 px-1.5 py-0.5 text-white">{item.rating}</span>
        <span>{item.duration}</span>
        <span>{item.year}</span>
        <span className="rounded border border-white/20 px-1 text-xs uppercase tracking-wide text-white/60">HD</span>
      </div>
      {genreLine && (
        <p className="mt-2 text-sm leading-relaxed text-[#d2d2d2]">
          {genreLine}
          {item.type ? ` · ${getContentTypeLabel(item.type)}` : ''}
        </p>
      )}
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/55">{item.description}</p>
    </div>
  )

  const posterImage = (
    <img
      src={imageSrc}
      alt={item.title}
      loading="lazy"
      onError={() => setImageSrc(fallbackUrl)}
      className="h-full w-full object-cover"
    />
  )

  const legacyOverlay = (
    <>
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/95 via-black/55 to-black/10 opacity-100 transition duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 z-20 p-3">
        <p className="truncate text-lg font-semibold text-white">{item.title}</p>
        {item.monthlyAward?.enabled && item.monthlyAward.prize ? (
          <p className="mt-0.5 truncate text-sm font-medium text-emerald-300">{item.monthlyAward.prize}</p>
        ) : null}
        <div className="mt-2 hidden space-y-1.5 md:block md:opacity-0 md:transition md:duration-200 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-white/80">
            <span className="rounded border border-white/25 px-1.5 py-0.5">{item.rating}</span>
            <span>{getContentTypeLabel(item.type)}</span>
            <span>{item.duration}</span>
            <span>{item.year}</span>
          </div>
          {genreLine && <p className="text-sm text-white/65">{genreLine}</p>}
          <p className="line-clamp-2 text-sm leading-relaxed text-white/55">{item.description}</p>
        </div>
      </div>
    </>
  )

  const expandedWidth = anchor ? anchor.width * HOVER_SCALE : 0
  const expandedLeft = anchor ? anchor.left + anchor.width / 2 - expandedWidth / 2 : 0

  const hoverPortal =
    hovered && anchor
      ? createPortal(
          <div
            className="fixed z-[9999] shadow-[0_16px_48px_rgba(0,0,0,0.75)]"
            style={{
              top: anchor.top,
              left: expandedLeft,
              width: expandedWidth,
            }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="block w-full border-0 bg-transparent p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold"
            >
              <div className="overflow-hidden rounded-t-md bg-plooy-surface ring-1 ring-white/25">
                <div className={`relative ${aspectClass} overflow-hidden`}>
                  {posterImage}
                  {badges}
                </div>
              </div>
              {hoverDetails}
            </button>
          </div>,
          document.body,
        )
      : null

  const netflixHoverCard = (
    <>
      <div
        ref={slotRef}
        className={`relative shrink-0 snap-start ${widthClass} ${hovered ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className={`relative overflow-hidden rounded-md bg-plooy-surface ring-1 ring-white/10 ${aspectClass}`}>
          {posterImage}
          {badges}
          {posterTitleOverlay(false)}
        </div>
        <button
          type="button"
          aria-label={item.title}
          onClick={() => onSelect(item)}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onFocus={(event) => {
            handleEnter()
            event.currentTarget.focus({ preventScroll: true })
          }}
          onBlur={handleLeave}
          className="absolute inset-0 z-10 border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold"
        />
      </div>
      {hoverPortal}
    </>
  )

  const standardCard = (
    <div className={`group relative flex flex-col text-left ${widthClass} ${isGrid ? 'overflow-hidden rounded-md bg-plooy-surface hover:ring-2 hover:ring-white/20' : 'shrink-0 snap-start overflow-hidden rounded-md bg-plooy-surface hover:z-10 hover:ring-2 hover:ring-white/20'}`}>
      <div className="relative w-full">
        <div className={`relative overflow-hidden rounded-md bg-plooy-surface ${aspectClass}`}>
          {posterImage}
          {badges}
          {isGrid ? posterTitleOverlay(false) : null}
          {guestHref && !isGrid ? legacyOverlay : null}
        </div>
      </div>
    </div>
  )

  if (enableNetflixHover) {
    return netflixHoverCard
  }

  if (guestHref) {
    return (
      <Link to={guestHref} className="block">
        {standardCard}
      </Link>
    )
  }

  return (
    <button type="button" onClick={() => onSelect(item)} className="border-0 bg-transparent p-0 text-left">
      {standardCard}
    </button>
  )
}
