import { resolveMediaUrl } from '../../api/client'
import type { ContentItem } from '../../types/content'

interface CekimNotlariCardProps {
  item: ContentItem
  onSelect: (item: ContentItem) => void
}

function expertName(item: ContentItem) {
  const director = item.credits?.directors?.[0]
  return director?.trim() || 'Sineoda Eğitim'
}

export function CekimNotlariCard({ item, onSelect }: CekimNotlariCardProps) {
  const imageUrl = resolveMediaUrl(item.backdrop || item.poster)

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group flex h-full w-full overflow-hidden rounded-xl border border-white/[0.06] bg-sineoda-surface text-left transition hover:border-white/12 hover:bg-sineoda-elevated/40"
    >
      <div className="relative w-[38%] shrink-0 overflow-hidden sm:w-[42%]">
        <div className="aspect-[4/3] h-full min-h-[7.5rem] sm:min-h-[8.5rem]">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-3 sm:px-4 sm:py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sineoda-accent sm:text-xs">
          {item.duration} · {item.rating}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-sineoda-accent sm:text-base">
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-sineoda-muted sm:line-clamp-3 sm:text-sm">
          {item.description}
        </p>
        <p className="mt-2 text-[11px] text-white/45">{expertName(item)}</p>
      </div>
    </button>
  )
}
