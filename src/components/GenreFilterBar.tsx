import { BROWSE_GENRES, type BrowseGenre } from '../constants/genres'

interface GenreFilterBarProps {
  activeGenre: string | null
  genres?: readonly BrowseGenre[]
  onChange: (genre: string | null) => void
}

export function GenreFilterBar({ activeGenre, genres = BROWSE_GENRES, onChange }: GenreFilterBarProps) {
  const chips = [{ id: null, label: 'Tümü' }, ...genres.map((g) => ({ id: g, label: g }))]

  return (
    <div className="sticky top-[4.5rem] z-30 -mx-4 border-b border-white/5 bg-plooy-bg/95 px-4 py-3 backdrop-blur-md sm:top-20 sm:-mx-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto hide-scrollbar">
        {chips.map((chip) => {
          const active = activeGenre === chip.id
          return (
            <button
              key={chip.label}
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
