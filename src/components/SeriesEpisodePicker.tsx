import type { Episode } from '../types/content'
import { formatEpisodeCode, formatEpisodeHeading } from '../utils/episodes'

interface SeriesEpisodePickerProps {
  seasons: number[]
  season: number
  seasonEpisodes: Episode[]
  episodesInSeason: (value: number) => number
  onSeasonChange: (season: number) => void
  onPlayEpisode: (episode: Episode) => void
  currentEpisodeId?: string
  compact?: boolean
}

export function SeriesEpisodePicker({
  seasons,
  season,
  seasonEpisodes,
  episodesInSeason,
  onSeasonChange,
  onPlayEpisode,
  currentEpisodeId,
  compact = false,
}: SeriesEpisodePickerProps) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="season-select">
          Sezon
        </label>
        <select
          id="season-select"
          value={season}
          onChange={(event) => onSeasonChange(Number(event.target.value))}
          className="rounded-lg border border-white/15 bg-[#11141c] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-sineoda-gold sm:hidden"
        >
          {seasons.map((value) => (
            <option key={value} value={value}>
              Sezon {value} ({episodesInSeason(value)} bölüm)
            </option>
          ))}
        </select>

        <div className="hidden flex-wrap gap-2 sm:flex">
          {seasons.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSeasonChange(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                season === value
                  ? 'bg-sineoda-gold text-sineoda-bg'
                  : 'bg-white/10 text-white/85 hover:bg-white/15'
              }`}
            >
              Sezon {value}
              <span className="ml-1.5 font-normal opacity-70">({episodesInSeason(value)})</span>
            </button>
          ))}
        </div>
      </div>

      <div className={compact ? 'max-h-[50vh] space-y-2 overflow-y-auto pr-1' : 'space-y-2'}>
        {seasonEpisodes.map((episode) => {
          const active = episode.id === currentEpisodeId
          return (
            <button
              key={episode.id}
              type="button"
              onClick={() => onPlayEpisode(episode)}
              className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sineoda-gold ${
                active
                  ? 'border-sineoda-gold/50 bg-sineoda-gold/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-sineoda-gold/15 text-sineoda-gold">
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {formatEpisodeCode(episode)}
                </span>
                <span className="text-lg font-bold leading-none">{episode.episode}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{formatEpisodeHeading(episode)}</p>
                {episode.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-sineoda-muted">{episode.description}</p>
                )}
                <p className="mt-1 text-xs text-sineoda-muted">{episode.duration}</p>
              </div>
              <span className="mt-1 shrink-0 text-white/80" aria-hidden="true">
                <PlayIcon />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
