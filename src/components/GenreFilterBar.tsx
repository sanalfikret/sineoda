import { useTranslation } from 'react-i18next'
import { BROWSE_GENRES, type BrowseGenre } from '../constants/genres'
import { useBrowseLabels } from '../i18n/useBrowseLabels'

interface GenreFilterBarProps {
  activeGenre: string | null
  genres?: readonly BrowseGenre[]
  onChange: (genre: string | null) => void
}

export function GenreFilterBar({ activeGenre, genres = BROWSE_GENRES, onChange }: GenreFilterBarProps) {
  const { t } = useTranslation('browse')
  const { translateGenre } = useBrowseLabels()
  const chips = [{ id: null, label: t('all') }, ...genres.map((g) => ({ id: g, label: translateGenre(g) }))]

  return (
    <div className="sticky top-[4.5rem] z-30 border-b border-white/5 bg-plooy-bg/95 py-3 backdrop-blur-md sm:top-20">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 scroll-pl-4 scroll-pr-4 sm:px-6 sm:scroll-pr-6 lg:px-8 lg:scroll-pr-8">
        {chips.map((chip) => {
          const active = activeGenre === chip.id
          return (
            <button
              key={chip.id ?? 'all'}
              type="button"
              onClick={() => onChange(chip.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold ${
                active
                  ? 'bg-plooy-gold text-plooy-bg'
                  : 'bg-white/10 text-white/85 hover:bg-white/15'
              }`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
