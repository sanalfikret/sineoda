import { useState } from 'react'
import { resolveMediaUrl } from '../api/client'
import { backdropUrlForId, enrichContentImages, posterUrlForId } from '../utils/contentImages'
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
  const isPortrait = layout === 'portrait' || item.videoFormat === 'vertical'
  const enriched = enrichContentImages(item)
  const imageUrl = resolveMediaUrl(
    isPortrait ? enriched.poster : enriched.backdrop || enriched.poster,
  )
  const fallbackUrl = isPortrait ? posterUrlForId(item.id, true) : backdropUrlForId(item.id)
  const [imageSrc, setImageSrc] = useState(imageUrl)

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
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group relative shrink-0 snap-start overflow-hidden rounded-md bg-sineoda-surface text-left transition duration-200 hover:z-10 hover:ring-2 hover:ring-white/20 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold ${widthClass}`}
    >
      <div className={isPortrait ? 'aspect-[9/16]' : 'aspect-video'}>
        <img
          src={imageSrc}
          alt={item.title}
          loading="lazy"
          onError={() => setImageSrc(fallbackUrl)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>

      {item.isNew && (
        <span className="absolute left-2 top-2 z-10 rounded bg-sineoda-gold px-2 py-0.5 text-[10px] font-bold text-sineoda-bg">
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

      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/95 via-black/55 to-black/10 opacity-100 transition duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100" />

      <div className="absolute inset-x-0 bottom-0 z-20 p-3">
        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
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
    </button>
  )
}
