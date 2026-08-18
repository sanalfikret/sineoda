import { resolveMediaUrl } from '../api/client'
import type { ContentItem } from '../types/content'

interface ContentCardProps {
  item: ContentItem
  onSelect: (item: ContentItem) => void
  progressPercent?: number
}

export function ContentCard({ item, onSelect, progressPercent }: ContentCardProps) {
  const isVertical = item.videoFormat === 'vertical'

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group relative shrink-0 snap-start overflow-hidden rounded-xl bg-sineoda-surface text-left transition duration-300 hover:z-10 hover:scale-105 focus-visible:z-10 focus-visible:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold ${
        isVertical ? 'w-[120px] sm:w-[140px] lg:w-[160px]' : 'w-[140px] sm:w-[170px] lg:w-[190px] tv:w-[220px]'
      }`}
    >
      <div className={isVertical ? 'aspect-[9/16] overflow-hidden' : 'aspect-[2/3] overflow-hidden'}>
        <img
          src={resolveMediaUrl(item.poster)}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
      </div>

      {item.isNew && (
        <span className="absolute left-2 top-2 rounded bg-sineoda-gold px-2 py-0.5 text-[10px] font-bold text-sineoda-bg">
          YENİ
        </span>
      )}

      {isVertical && (
        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
          Dikey
        </span>
      )}

      {progressPercent !== undefined && progressPercent > 2 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
          <div className="h-full bg-sineoda-gold" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
        <p className="text-xs text-white/70">{item.year}</p>
      </div>
    </button>
  )
}
