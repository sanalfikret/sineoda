import { useEffect, useMemo, useState } from 'react'
import { fetchEpisodes, fetchWatchProgress, resolveMediaUrl } from '../api/client'
import type { ContentItem, Episode } from '../types/content'
import { useWatchlist } from '../context/WatchlistContext'

interface DetailModalProps {
  item: ContentItem | null
  onClose: () => void
  onPlay: (item: ContentItem, episode?: Episode) => void
}

function formatResumeTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  return `${mins} dk`
}

export function DetailModal({ item, onClose, onPlay }: DetailModalProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist()
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [season, setSeason] = useState(1)
  const [resumePosition, setResumePosition] = useState<number | null>(null)

  useEffect(() => {
    if (!item || item.type !== 'dizi') {
      setEpisodes([])
      return
    }

    fetchEpisodes(item.id)
      .then((data) => {
        setEpisodes(data.episodes)
        setSeason(data.episodes[0]?.season ?? 1)
      })
      .catch(() => setEpisodes([]))
  }, [item])

  useEffect(() => {
    if (!item) {
      setResumePosition(null)
      return
    }

    fetchWatchProgress(item.id)
      .then(({ progress }) => {
        if (
          progress &&
          progress.position > 10 &&
          progress.duration > 0 &&
          progress.position < progress.duration - 30
        ) {
          setResumePosition(progress.position)
        }
      })
      .catch(() => {
        setResumePosition(null)
      })
  }, [item])

  useEffect(() => {
    if (!item) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [item, onClose])

  const sortedEpisodes = useMemo(
    () => [...episodes].sort((a, b) => a.season - b.season || a.episode - b.episode),
    [episodes],
  )

  if (!item) return null

  const inList = isInWatchlist(item.id)
  const seasons = [...new Set(episodes.map((ep) => ep.season))].sort((a, b) => a - b)
  const seasonEpisodes = episodes.filter((ep) => ep.season === season)
  const firstEpisode = sortedEpisodes[0]
  const canResume = resumePosition !== null && resumePosition > 10

  return (
    <div
      className="safe-top safe-bottom fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-sineoda-surface sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="relative aspect-video w-full overflow-hidden sm:rounded-t-3xl">
          <img src={resolveMediaUrl(item.backdrop)} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-sineoda-surface via-transparent to-black/30" />
          {item.isNew && (
            <span className="absolute left-4 top-4 rounded bg-sineoda-gold px-2.5 py-1 text-xs font-bold text-sineoda-bg">
              YENİ
            </span>
          )}
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <h2 id="detail-title" className="text-2xl font-bold text-white sm:text-3xl">
            {item.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-sineoda-muted">
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
              {item.rating}
            </span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white capitalize">
              {item.type}
            </span>
            {item.videoFormat === 'vertical' && (
              <span className="rounded bg-sineoda-gold/20 px-2 py-0.5 text-xs text-sineoda-gold">
                Dikey
              </span>
            )}
            <span>{item.year}</span>
            <span>•</span>
            <span>{item.duration}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80"
              >
                {genre}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
            {item.description}
          </p>

          {item.type === 'dizi' && episodes.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex flex-wrap gap-2">
                {seasons.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSeason(value)}
                    className={`rounded-full px-4 py-1.5 text-sm ${
                      season === value
                        ? 'bg-sineoda-gold text-sineoda-bg'
                        : 'bg-white/10 text-white/85'
                    }`}
                  >
                    Sezon {value}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {seasonEpisodes.map((episode) => (
                  <button
                    key={episode.id}
                    type="button"
                    onClick={() => onPlay(item, episode)}
                    className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sineoda-gold"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sineoda-gold/15 text-sm font-bold text-sineoda-gold">
                      {episode.episode}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{episode.title}</p>
                      <p className="text-xs text-sineoda-muted">{episode.duration}</p>
                    </div>
                    <PlaySmallIcon />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {canResume && item.type === 'film' && (
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
              >
                <PlaySmallIcon />
                Kaldığın Yerden Devam ({formatResumeTime(resumePosition)})
              </button>
            )}

            {!canResume && item.type === 'dizi' && episodes.length > 0 && firstEpisode && (
              <button
                type="button"
                onClick={() => onPlay(item, firstEpisode)}
                className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
              >
                <PlaySmallIcon />
                1. Bölümü Oynat
              </button>
            )}

            {!canResume && item.type !== 'dizi' && (
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
              >
                <PlaySmallIcon />
                Oynat
              </button>
            )}

            <button
              type="button"
              onClick={() => void toggleWatchlist(item.id)}
              className={`rounded-lg border px-5 py-3 text-sm font-semibold transition ${
                inList
                  ? 'border-sineoda-gold bg-sineoda-gold/10 text-sineoda-gold'
                  : 'border-white/15 text-white hover:bg-white/5'
              }`}
            >
              {inList ? 'Listemde ✓' : 'Listeme Ekle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlaySmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
