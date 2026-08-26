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
      className="group block w-full overflow-hidden rounded-xl border border-white/[0.06] bg-sineoda-surface text-left transition hover:border-white/12"
    >
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-col justify-center p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sineoda-accent">
          {item.duration} · {item.rating}
        </p>
        <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-white group-hover:text-sineoda-accent">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-sineoda-muted">{item.description}</p>
        <p className="mt-3 text-xs text-white/45">{expertName(item)}</p>
      </div>
    </button>
  )
}
