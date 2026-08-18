import { useState } from 'react'
import { resolveMediaUrl } from '../api/client'
import type { ContentItem } from '../types/content'
import { getContentTypeLabel } from '../constants/contentTypes'

interface ContentCardProps {
  item: ContentItem
  onSelect: (item: ContentItem) => void
  progressPercent?: number
  size?: 'default' | 'large'
  layout?: 'landscape' | 'portrait'
}

export function ContentCard({
  item,
  onSelect,
  progressPercent,
  size = 'default',
  layout = 'landscape',
}: ContentCardProps) {
  const [hovered, setHovered] = useState(false)
  const isPortrait = layout === 'portrait' || item.videoFormat === 'vertical'
  const imageUrl = resolveMediaUrl(isPortrait ? item.poster : item.backdrop || item.poster)

  const widthClass = isPortrait
    ? size === 'large'
      ? 'w-[140px] sm:w-[160px]'
      : 'w-[120px] sm:w-[140px]'
    : size === 'large'
      ? 'w-[260px] sm:w-[300px] lg:w-[320px]'
      : 'w-[220px] sm:w-[260px] lg:w-[280px]'

  const metaLine = [item.rating, item.duration, String(item.year)].filter(Boolean).join(' · ')
  const genreLine = item.genres.slice(0, 3).join(' · ')

  return (
    <div
      className={`group/card relative shrink-0 snap-start ${widthClass}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={`relative w-full overflow-hidden rounded-md bg-sineoda-surface text-left transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold ${
          hovered ? 'z-20 scale-[1.08] shadow-2xl' : 'z-0'
        }`}
      >
        <div className={isPortrait ? 'aspect-[9/16]' : 'aspect-video'}>
          <img
            src={imageUrl}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>

        {item.isNew && (
          <span className="absolute left-2 top-2 rounded bg-sineoda-gold px-2 py-0.5 text-[10px] font-bold text-sineoda-bg">
            YENİ
          </span>
        )}

        {item.videoFormat === 'vertical' && (
          <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
            Dikey
          </span>
        )}

        {progressPercent !== undefined && progressPercent > 2 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div
              className="h-full bg-sineoda-gold"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 md:hidden">
          <p className="truncate text-sm font-semibold text-white">{item.title}</p>
          <p className="truncate text-xs text-white/70">{metaLine}</p>
        </div>
      </button>

      {!isPortrait && (
        <div
          className={`pointer-events-none absolute left-0 top-0 z-30 hidden w-full origin-top overflow-hidden rounded-md border border-white/10 bg-[#181818] shadow-2xl transition duration-300 md:block ${
            hovered ? 'scale-[1.12] opacity-100' : 'scale-100 opacity-0'
          }`}
        >
          <div className="aspect-video">
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="space-y-2 p-3">
            <p className="truncate text-sm font-semibold text-white">{item.title}</p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/75">
              <span className="rounded border border-white/20 px-1.5 py-0.5">{item.rating}</span>
              <span>{getContentTypeLabel(item.type)}</span>
              <span>{item.duration}</span>
              <span>{item.year}</span>
            </div>
            {genreLine && <p className="text-xs text-white/60">{genreLine}</p>}
            <p className="line-clamp-2 text-xs leading-relaxed text-white/55">{item.description}</p>
          </div>
        </div>
      )}
    </div>
  )
}
