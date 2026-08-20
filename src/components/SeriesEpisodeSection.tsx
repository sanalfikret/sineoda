import { useEffect, useMemo, useState } from 'react'
import type { ContentItem, Episode } from '../types/content'
import { groupEpisodesBySeason, sortEpisodes } from '../utils/episodes'

interface SeriesEpisodeSectionProps {
  item: ContentItem
  episodes: Episode[]
  onPlay: (item: ContentItem, episode: Episode) => void
  compact?: boolean
  initialSeason?: number
}

function PlaySmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export function SeriesEpisodeSection({
  item,
  episodes,
  onPlay,
  compact = false,
  initialSeason,
}: SeriesEpisodeSectionProps) {
  const sortedEpisodes = useMemo(() => sortEpisodes(episodes), [episodes])
  const seasonGroups = useMemo(() => groupEpisodesBySeason(episodes), [episodes])
  const [season, setSeason] = useState(() => initialSeason ?? seasonGroups[0]?.[0] ?? 1)

  useEffect(() => {
    if (initialSeason !== undefined) {
      setSeason(initialSeason)
    }
  }, [initialSeason, item.id])

  const activeSeason = seasonGroups.some(([value]) => value === season)
    ? season
    : (seasonGroups[0]?.[0] ?? 1)

  const activeEpisodes =
    seasonGroups.find(([value]) => value === activeSeason)?.[1] ?? sortedEpisodes

  if (episodes.length === 0) return null

  if (item.videoFormat === 'vertical') {
    return (
      <div className={compact ? 'mt-6' : 'mt-8'}>
        <h2 className={`${compact ? 'text-sm' : 'text-lg'} mb-3 font-semibold text-white`}>
          Bölümler
        </h2>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
          {sortedEpisodes.map((episode) => (
            <button
              key={episode.id}
              type="button"
              onClick={() => onPlay(item, episode)}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-sineoda-gold/40 hover:bg-sineoda-gold/10"
            >
              <p className="text-lg font-bold text-sineoda-gold">{episode.episode}</p>
              <p className="mt-1 max-w-[120px] truncate text-xs text-white">{episode.title}</p>
              <p className="text-[10px] text-sineoda-muted">{episode.duration}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={compact ? 'mt-6' : 'mt-8'}>
      <h2 className={`${compact ? 'text-sm' : 'text-lg'} mb-1 font-semibold text-white`}>
        Sezonlar ve Bölümler
      </h2>
      <p className="mb-4 text-sm text-sineoda-muted">
        {seasonGroups.length} sezon · {episodes.length} bölüm
      </p>

      <div className="hide-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {seasonGroups.map(([seasonNum, seasonItems]) => {
          const selected = activeSeason === seasonNum
          return (
            <button
              key={seasonNum}
              type="button"
              onClick={() => setSeason(seasonNum)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                selected
                  ? 'bg-sineoda-gold text-sineoda-bg shadow-md shadow-sineoda-gold/20'
                  : 'bg-white/10 text-white/85 hover:bg-white/15'
              }`}
            >
              Sezon {seasonNum}
              <span className={`ml-1.5 text-xs ${selected ? 'text-sineoda-bg/80' : 'text-white/60'}`}>
                ({seasonItems.length})
              </span>
            </button>
          )
        })}
      </div>

      <div>
        <h3 className={`${compact ? 'text-sm' : 'text-base'} mb-3 font-semibold text-white`}>
          Sezon {activeSeason}
          <span className="ml-2 text-sm font-normal text-sineoda-muted">
            · {activeEpisodes.length} bölüm
          </span>
        </h3>
        <div className="space-y-2">
          {activeEpisodes.map((episode) => (
            <button
              key={episode.id}
              type="button"
              onClick={() => onPlay(item, episode)}
              className={`flex w-full items-start gap-4 rounded-xl border border-white/10 bg-white/5 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sineoda-gold ${
                compact ? 'p-3' : 'p-4'
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sineoda-gold/15 text-sm font-bold text-sineoda-gold">
                {episode.episode}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">
                  Bölüm {episode.episode}: {episode.title}
                </p>
                {episode.description && !compact && (
                  <p className="mt-1 line-clamp-2 text-xs text-sineoda-muted">{episode.description}</p>
                )}
                <p className="mt-1 text-xs text-sineoda-muted">{episode.duration}</p>
              </div>
              <PlaySmallIcon />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
