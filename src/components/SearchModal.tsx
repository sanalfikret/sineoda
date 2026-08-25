import { useEffect, useMemo, useState } from 'react'
import type { ContentItem, SearchFilters } from '../types/content'
import { getAllGenres, getAllYears, searchContent } from '../utils/search'
import { isContentAllowedForKids } from '../utils/contentRating'
import { ContentCard } from './ContentCard'
import { useContent } from '../context/ContentContext'
import { CONTENT_TYPES } from '../constants/contentTypes'
import { useSearchUI } from '../context/SearchContext'

interface SearchModalProps {
  onSelect: (item: ContentItem) => void
  kidsSafe?: boolean
}

export function SearchModal({ onSelect, kidsSafe = false }: SearchModalProps) {
  const { visibleCatalog } = useContent()
  const { isOpen, closeSearch } = useSearchUI()
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<string | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [type, setType] = useState<SearchFilters['type']>(null)

  const genres = useMemo(() => getAllGenres(visibleCatalog), [visibleCatalog])
  const years = useMemo(() => getAllYears(visibleCatalog), [visibleCatalog])

  const filters: SearchFilters = { query, genre, year, type }
  const results = useMemo(() => {
    const found = searchContent(visibleCatalog, filters).filter((item) => item.program !== 'student_cinema')
    if (!kidsSafe) return found
    return found.filter((item) => isContentAllowedForKids(item.rating))
  }, [visibleCatalog, query, genre, year, type, kidsSafe])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSearch()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, closeSearch])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setGenre(null)
      setYear(null)
      setType(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelect = (item: ContentItem) => {
    closeSearch()
    onSelect(item)
  }

  return (
    <div
      className="safe-top safe-bottom fixed inset-0 z-50 bg-sineoda-bg/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="İçerik ara"
    >
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-sineoda-muted" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Film, dizi veya tür ara..."
              className="w-full rounded-xl border border-white/10 bg-sineoda-surface py-3.5 pl-12 pr-4 text-white outline-none transition focus:border-sineoda-gold"
            />
          </div>
          <button
            type="button"
            onClick={closeSearch}
            className="rounded-xl px-4 py-3.5 text-sm text-sineoda-muted transition hover:text-white"
          >
            Kapat
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip label="Tümü" active={type === null} onClick={() => setType(null)} />
          {CONTENT_TYPES.map((entry) => (
            <FilterChip
              key={entry.value}
              label={entry.label}
              active={type === entry.value}
              onClick={() => setType(entry.value)}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={genre ?? ''}
            onChange={(event) => setGenre(event.target.value || null)}
            className="rounded-lg border border-white/10 bg-sineoda-surface px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
          >
            <option value="">Tüm türler</option>
            {genres.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>

          <select
            value={year ?? ''}
            onChange={(event) => setYear(event.target.value ? Number(event.target.value) : null)}
            className="rounded-lg border border-white/10 bg-sineoda-surface px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
          >
            <option value="">Tüm yıllar</option>
            {years.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          <p className="mb-4 text-sm text-sineoda-muted">{results.length} sonuç bulundu</p>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.map((item) => (
                <ContentCard key={item.id} item={item} onSelect={handleSelect} variant="grid" />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-sineoda-surface px-6 py-12 text-center">
              <p className="text-lg font-medium text-white">Sonuç bulunamadı</p>
              <p className="mt-2 text-sm text-sineoda-muted">
                Farklı bir arama terimi veya filtre dene.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-sineoda-gold text-sineoda-bg'
          : 'bg-sineoda-surface text-white/80 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
