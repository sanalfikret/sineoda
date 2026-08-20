import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { ContentItem } from '../types/content'
import { ContentCard } from './ContentCard'
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
  const rowRef = useRef<HTMLDivElement>(null)

  if (items.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    const container = rowRef.current
    if (!container) return
    const amount = direction === 'left' ? -container.clientWidth * 0.8 : container.clientWidth * 0.8
    container.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className={`mb-8 ${className}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
            Genç Sinema
          </p>
          <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">Ayın Genç Sinema Seçkileri</h2>
          <p className="mt-1 text-sm text-white/50">Sinema okullarından öğrenci ve mezun filmleri</p>
        </div>
        <Link
          to={guestMode ? '/giris' : '/genc-sinema'}
          className="text-sm font-medium text-emerald-300 hover:underline"
        >
          Tümünü gör
        </Link>
      </div>

      <div className="relative px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-12 bg-gradient-to-r from-sineoda-bg to-transparent sm:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-12 bg-gradient-to-l from-sineoda-bg to-transparent sm:block" />

        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin sm:gap-4"
          style={{ scrollbarWidth: 'thin' }}
        >
          {items.map((item) =>
            guestMode ? (
              <Link
                key={item.id}
                to="/giris"
                className="group w-[160px] shrink-0 sm:w-[200px]"
              >
                <div className="overflow-hidden rounded-lg border border-emerald-500/20 bg-[#11141c] transition group-hover:border-emerald-400/40">
                  <img
                    src={resolveMediaUrl(item.poster)}
                    alt=""
                    className="aspect-[2/3] w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium text-white">{item.title}</p>
              </Link>
            ) : (
              <div key={item.id} className="w-[160px] shrink-0 sm:w-[200px]">
                <ContentCard item={item} onSelect={() => onSelect?.(item)} layout="portrait" />
              </div>
            ),
          )}
        </div>

        <div className="mt-3 hidden justify-end gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
            aria-label="Sola kaydır"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
            aria-label="Sağa kaydır"
          >
            →
          </button>
        </div>
      </div>
    </section>
  )
}
