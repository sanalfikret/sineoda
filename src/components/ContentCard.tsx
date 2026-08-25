import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client'
import { getContentTypeLabel } from '../constants/contentTypes'
import type { ContentItem } from '../types/content'
import { backdropUrlForId, enrichContentImages, posterUrlForId } from '../utils/contentImages'

interface ContentCardProps {
  item: ContentItem
  onSelect: (item: ContentItem) => void
  progressPercent?: number
  size?: 'default' | 'large'
  layout?: 'landscape' | 'portrait'
  variant?: 'carousel' | 'grid'
  guestHref?: string
}

export function ContentCard({
  item,
  onSelect,
  progressPercent,
  size = 'default',
  layout = 'landscape',
  variant = 'carousel',
  guestHref,
}: ContentCardProps) {
  const isGrid = variant === 'grid'
  const isPortrait = !isGrid && (layout === 'portrait' || item.videoFormat === 'vertical')
  const enriched = enrichContentImages(item)
  const imageUrl = resolveMediaUrl(
    isPortrait ? enriched.poster : enriched.backdrop || enriched.poster,
  )
  const fallbackUrl = isPortrait ? posterUrlForId(item.id, true) : backdropUrlForId(item.id)
  const [imageSrc, setImageSrc] = useState(imageUrl)
  const [hovered, setHovered] = useState(false)
  const leaveTimerRef = useRef<number | null>(null)

  const widthClass = isGrid
    ? 'w-full'
    : isPortrait
      ? size === 'large'
        ? 'w-[140px] sm:w-[160px]'
        : 'w-[120px] sm:w-[140px]'
      : size === 'large'
        ? 'w-[260px] sm:w-[300px] lg:w-[320px]'
        : 'w-[220px] sm:w-[260px] lg:w-[280px]'

  const metaLine = [item.rating, item.duration, String(item.year)].filter(Boolean).join(' · ')
  const genreLine = item.genres.slice(0, 3).join(' · ')
  const enableNetflixHover = !isGrid && !guestHref

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }

  useEffect(() => () => clearLeaveTimer(), [])

  const handleEnter = () => {
    if (!enableNetflixHover) return
    clearLeaveTimer()
    setHovered(true)
  }

  const handleLeave = () => {
    if (!enableNetflixHover) return
    clearLeaveTimer()
    leaveTimerRef.current = window.setTimeout(() => setHovered(false), 120)
  }

  const shellClass = [
    'group relative text-left transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold',
    widthClass,
    isGrid ? 'overflow-hidden rounded-md bg-sineoda-surface hover:ring-2 hover:ring-white/20' : 'shrink-0 snap-start',
    enableNetflixHover ? 'z-0 hover:z-30 focus-visible:z-30' : '',
    enableNetflixHover && hovered ? 'z-30 scale-[1.14]' : '',
    !enableNetflixHover && !isGrid ? 'overflow-hidden rounded-md bg-sineoda-surface hover:z-10 hover:ring-2 hover:ring-white/20' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const imageShellClass = [
    'overflow-hidden rounded-md bg-sineoda-surface shadow-lg ring-1 ring-white/10',
    enableNetflixHover && hovered ? 'rounded-b-none ring-white/20' : '',
  ].join(' ')

  const body = (
    <>
      <div className={isPortrait ? 'aspect-[9/16]' : 'aspect-video'}>
        <img
          src={imageSrc}
          alt={item.title}
          loading="lazy"
          onError={() => setImageSrc(fallbackUrl)}
          className={`h-full w-full object-cover transition duration-300 ${
            enableNetflixHover ? '' : 'group-hover:scale-105'
          }`}
        />
      </div>

      {item.isNew && !item.monthlyAward?.enabled && (
        <span className="absolute left-2 top-2 z-10 rounded bg-sineoda-gold px-2 py-0.5 text-[10px] font-bold text-sineoda-bg">
          YENİ
        </span>
      )}

      {item.monthlyAward?.enabled && item.monthlyAward.badge && (
        <span className="absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] truncate rounded bg-emerald-400 px-2 py-0.5 text-[10px] font-bold text-[#07110d]">
          {item.monthlyAward.badge}
        </span>
      )}

      {item.isNew && item.monthlyAward?.enabled && (
        <span className="absolute left-2 top-8 z-10 rounded bg-sineoda-gold px-2 py-0.5 text-[10px] font-bold text-sineoda-bg">
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
            className="h-full bg-sineoda-gold"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      )}

      {!enableNetflixHover && (
        <>
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/95 via-black/55 to-black/10 opacity-100 transition duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100" />
          <div className="absolute inset-x-0 bottom-0 z-20 p-3">
            <p className="truncate text-sm font-semibold text-white">{item.title}</p>
            {item.monthlyAward?.enabled && item.monthlyAward.prize ? (
              <p className="mt-0.5 truncate text-xs font-medium text-emerald-300">{item.monthlyAward.prize}</p>
            ) : null}
            <p className="mt-0.5 truncate text-xs text-white/75 md:hidden">{metaLine}</p>
            <div className="mt-2 hidden space-y-1.5 md:block md:opacity-0 md:transition md:duration-200 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/80">
                <span className="rounded border border-white/25 px-1.5 py-0.5">{item.rating}</span>
                <span>{getContentTypeLabel(item.type)}</span>
                <span>{item.duration}</span>
                <span>{item.year}</span>
              </div>
              {genreLine && <p className="text-xs text-white/65">{genreLine}</p>}
              <p className="line-clamp-2 text-xs leading-relaxed text-white/55">{item.description}</p>
            </div>
          </div>
        </>
      )}

      {enableNetflixHover && (
        <div
          className={`absolute left-0 right-0 top-full z-20 overflow-hidden rounded-b-md border border-t-0 border-white/10 bg-[#181818] shadow-2xl transition-all duration-200 ${
            hovered
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-1 opacity-0 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100'
          }`}
        >
          <div className="space-y-2 p-3">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black"
                aria-hidden="true"
              >
                ▶
              </span>
              <span className="rounded-full border border-white/20 p-1.5 text-xs text-white/80" aria-hidden="true">
                i
              </span>
            </div>
            <p className="line-clamp-1 text-sm font-semibold text-white">{item.title}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/75">
              <span className="rounded border border-white/25 px-1.5 py-0.5">{item.rating}</span>
              <span>{item.duration}</span>
              <span>{item.year}</span>
              <span className="text-white/45">HD</span>
            </div>
            {genreLine && <p className="text-xs text-white/60">{genreLine}</p>}
            <p className="line-clamp-3 text-xs leading-relaxed text-white/55">{item.description}</p>
          </div>
        </div>
      )}
    </>
  )

  const cardInner = <div className={enableNetflixHover ? imageShellClass : 'relative h-full w-full'}>{body}</div>

  if (guestHref) {
    return (
      <Link to={guestHref} className={shellClass}>
        {cardInner}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={shellClass}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {cardInner}
    </button>
  )
}
