import { Link } from 'react-router-dom'
import type { ContentItem } from '../types/content'
import { ContentRow } from './ContentRow'
import { resolveMediaUrl } from '../api/client'

interface StudentCinemaPicksRowProps {
  items: ContentItem[]
  onSelect?: (item: ContentItem) => void
  guestMode?: boolean
  className?: string
}

export function StudentCinemaPicksRow({
  items,
  onSelect,
  guestMode = false,
  className = '',
}: StudentCinemaPicksRowProps) {
  if (items.length === 0) return null

  if (guestMode) {
    return (
      <section className={`mb-5 ${className}`}>
        <div className="mb-2 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Ayın Genç Sinema Seçkileri</h2>
          <Link to="/giris" className="text-sm font-medium text-sineoda-gold hover:underline">
            Tümünü gör
          </Link>
        </div>
        <div className="hide-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 sm:gap-3 sm:px-6 lg:px-8">
          {items.map((item) => (
            <Link key={item.id} to="/giris" className="group w-[120px] shrink-0 snap-start sm:w-[140px]">
              <div className="overflow-hidden rounded-md bg-sineoda-surface">
                <img
                  src={resolveMediaUrl(item.poster)}
                  alt=""
                  className="aspect-[9/16] w-full object-cover transition group-hover:scale-105"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium text-white">{item.title}</p>
            </Link>
          ))}
        </div>
      </section>
    )
  }

  if (!onSelect) return null

  return (
    <div className={className}>
      <ContentRow
        title="Ayın Genç Sinema Seçkileri"
        items={items}
        onSelect={onSelect}
        layout="portrait"
        viewAllHref="/genc-sinema"
      />
    </div>
  )
}
