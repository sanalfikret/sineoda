import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllWatchProgress, fetchEpisodes, resolveMediaUrl } from '../api/client'
import type { ContentItem, Episode } from '../types/content'
import { FEEDBACK_EMAIL } from '../constants/site'
import { getContentTypeLabel, isSeriesContent } from '../constants/contentTypes'
import { ContentActionButtons } from './ContentActionButtons'

interface ContentDetailViewProps {
  item: ContentItem
  onPlay: (item: ContentItem, episode?: Episode) => void
  onBack?: () => void
  mode?: 'page' | 'modal'
}

type DetailTab = 'overview' | 'details'

interface ResumeState {
  episode: Episode
  position: number
}

function formatResumeTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  return `${mins} dk`
}

function CreditList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-muted">{label}</p>
      <p className="mt-1 text-sm text-white/90">{items.join(', ')}</p>
    </div>
  )
}

export function ContentDetailView({ item, onPlay, onBack, mode = 'page' }: ContentDetailViewProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [season, setSeason] = useState(1)
  const [resumeEpisode, setResumeEpisode] = useState<ResumeState | null>(null)
  const [resumeFilmPosition, setResumeFilmPosition] = useState<number | null>(null)
  const [tab, setTab] = useState<DetailTab>('overview')

  useEffect(() => {
    if (!isSeriesContent(item.type)) {
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
    setTab('overview')
    setResumeEpisode(null)
    setResumeFilmPosition(null)

    if (isSeriesContent(item.type)) {
      fetchAllWatchProgress()
        .then((data) => {
          const entries = data.items.filter((entry) => entry.contentId === item.id && entry.episodeId)
          let best: { episodeId: string; percent: number; position: number } | null = null

          for (const entry of entries) {
            if (entry.duration <= 0 || entry.position < 10) continue
            if (entry.position >= entry.duration - 30) continue
            const percent = (entry.position / entry.duration) * 100
            if (!best || percent > best.percent) {
              best = {
                episodeId: entry.episodeId!,
                percent,
                position: entry.position,
              }
            }
          }

          if (!best) return

          fetchEpisodes(item.id)
            .then(({ episodes: eps }) => {
              const episode = eps.find((ep) => ep.id === best!.episodeId)
              if (episode) {
                setResumeEpisode({ episode, position: best!.position })
                setSeason(episode.season)
              }
            })
            .catch(() => undefined)
        })
        .catch(() => setResumeEpisode(null))

      return
    }

    fetchAllWatchProgress()
      .then((data) => {
        const entry = data.items.find((row) => row.contentId === item.id && !row.episodeId)
        if (
          entry &&
          entry.position > 10 &&
          entry.duration > 0 &&
          entry.position < entry.duration - 30
        ) {
          setResumeFilmPosition(entry.position)
        }
      })
      .catch(() => setResumeFilmPosition(null))
  }, [item])

  const sortedEpisodes = useMemo(
    () => [...episodes].sort((a, b) => a.season - b.season || a.episode - b.episode),
    [episodes],
  )

  const seasons = [...new Set(episodes.map((ep) => ep.season))].sort((a, b) => a - b)
  const seasonEpisodes = episodes.filter((ep) => ep.season === season)
  const episodesInSeason = (value: number) => episodes.filter((ep) => ep.season === value).length
  const firstEpisode = sortedEpisodes.find((episode) => episode.videoUrl?.trim()) ?? sortedEpisodes[0]
  const hasEpisodeVideo = sortedEpisodes.some((episode) => episode.videoUrl?.trim())
  const hasMainVideo = Boolean(item.videoUrl?.trim())
  const canPlay = hasEpisodeVideo || hasMainVideo
  const isSeries = isSeriesContent(item.type)
  const seriesResume = resumeEpisode && isSeries ? resumeEpisode : null
  const filmResume = resumeFilmPosition
  const credits = item.credits ?? {}
  const audioLanguages = credits.audioLanguages ?? ['Türkçe']
  const subtitleLanguages =
    credits.subtitleLanguages ??
    (item.subtitles?.length
      ? item.subtitles.map((track) => track.label || track.lang)
      : ['Türkçe'])

  const seriesMeta =
    isSeries && episodes.length > 0
      ? `${seasons.length} Sezon · ${episodes.length} Bölüm`
      : null

  return (
    <div className={mode === 'modal' ? '' : 'min-h-dvh bg-sineoda-bg text-white'}>
      <div className={`relative aspect-video w-full overflow-hidden ${mode === 'page' ? 'max-h-[50vh]' : 'sm:rounded-t-3xl'}`}>
        <img src={resolveMediaUrl(item.backdrop)} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-sineoda-bg via-black/20 to-black/40" />

        {item.isNew && (
          <span className="absolute left-4 top-4 rounded bg-sineoda-gold px-2.5 py-1 text-xs font-bold text-sineoda-bg">
            YENİ
          </span>
        )}

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="fixed left-4 top-[4.75rem] z-50 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/80 sm:left-6 sm:top-20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Geri
          </button>
        )}
      </div>

      <div className={`p-5 sm:p-6 ${mode === 'page' ? 'mx-auto max-w-4xl' : ''}`}>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{item.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-sineoda-muted">
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
            {item.rating}
          </span>
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white">
            {getContentTypeLabel(item.type)}
          </span>
          {item.videoFormat === 'vertical' && (
            <span className="rounded bg-sineoda-gold/20 px-2 py-0.5 text-xs text-sineoda-gold">
              Dikey
            </span>
          )}
          <span>{item.year}</span>
          {seriesMeta ? (
            <>
              <span>•</span>
              <span>{seriesMeta}</span>
            </>
          ) : (
            <>
              <span>•</span>
              <span>{item.duration}</span>
            </>
          )}
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {seriesResume && (
            <button
              type="button"
              onClick={() => onPlay(item, seriesResume.episode)}
              className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              <PlaySmallIcon />
              Kaldığın Yerden Devam · S{seriesResume.episode.season} B{seriesResume.episode.episode}
            </button>
          )}

          {filmResume !== null && (
            <button
              type="button"
              onClick={() => onPlay(item)}
              className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              <PlaySmallIcon />
              Kaldığın Yerden Devam ({formatResumeTime(filmResume)})
            </button>
          )}

          {!seriesResume && !filmResume && isSeries && firstEpisode && hasEpisodeVideo && (
            <button
              type="button"
              onClick={() => onPlay(item, firstEpisode)}
              className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              <PlaySmallIcon />
              {item.videoFormat === 'vertical' ? 'Dikey İzlemeye Başla' : '1. Bölümü Oynat'}
            </button>
          )}

          {!seriesResume && !filmResume && isSeries && !hasEpisodeVideo && hasMainVideo && (
            <button
              type="button"
              onClick={() => onPlay(item)}
              className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              <PlaySmallIcon />
              {item.videoFormat === 'vertical' ? 'Dikey İzle' : 'Oynat'}
            </button>
          )}

          {!seriesResume && !filmResume && !isSeries && hasMainVideo && (
            <button
              type="button"
              onClick={() => onPlay(item)}
              className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              <PlaySmallIcon />
              Oynat
            </button>
          )}

          {!canPlay && (
            <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-sineoda-muted">
              Bu içerik için henüz video eklenmemiş.
            </p>
          )}

          <ContentActionButtons contentId={item.id} title={item.title} showLabels />
        </div>

        <div className="mt-6 flex gap-4 border-b border-white/10">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
            Özet
          </TabButton>
          <TabButton active={tab === 'details'} onClick={() => setTab('details')}>
            Ayrıntılar
          </TabButton>
          {isSeries && episodes.length > 0 && (
            <span className="border-b-2 border-transparent pb-2 text-sm font-medium text-white/60">
              Bölümler ({episodes.length})
            </span>
          )}
        </div>

        {tab === 'overview' && (
          <>
            <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">{item.description}</p>

            {isSeries && episodes.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-1 text-lg font-semibold text-white">Sezonlar ve Bölümler</h2>
                {seriesMeta && <p className="mb-4 text-sm text-sineoda-muted">{seriesMeta}</p>}

                {item.videoFormat === 'vertical' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap gap-2">
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
                          Sezon {value} ({episodesInSeason(value)} Bölüm)
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {seasonEpisodes.map((episode) => (
                        <button
                          key={episode.id}
                          type="button"
                          onClick={() => onPlay(item, episode)}
                          className="flex w-full items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sineoda-gold"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sineoda-gold/15 text-sm font-bold text-sineoda-gold">
                            {episode.episode}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white">
                              Bölüm {episode.episode}: {episode.title}
                            </p>
                            {episode.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-sineoda-muted">
                                {episode.description}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-sineoda-muted">{episode.duration}</p>
                          </div>
                          <PlaySmallIcon />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'details' && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Yapımcılar ve Oyuncular</h3>
              <CreditList label="Yönetmenler" items={credits.directors ?? []} />
              <CreditList label="Yapımcılar" items={credits.producers ?? []} />
              <CreditList label="Oyuncu Kadrosu" items={credits.cast ?? []} />
              {credits.studio && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-muted">Stüdyo</p>
                  <p className="mt-1 text-sm text-white/90">{credits.studio}</p>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-muted">
                  Seslendirme Dilleri
                </p>
                <p className="mt-1 text-sm text-white/90">{audioLanguages.join(', ')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-muted">Alt Yazılar</p>
                <p className="mt-1 text-sm text-white/90">{subtitleLanguages.join(', ')}</p>
              </div>
              {isSeries && seriesMeta && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-muted">Yapı</p>
                  <p className="mt-1 text-sm text-white/90">{seriesMeta}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
          <p className="text-sm text-white/70">
            Oynat&apos;a tıklayarak{' '}
            <Link to="/yasal/kullanim-kosullari" className="text-sineoda-gold underline underline-offset-2">
              Kullanım Koşulları
            </Link>
            &apos;mızı kabul etmiş olursunuz.
          </p>
          <div>
            <p className="text-sm font-medium text-white">Geri bildirim</p>
            <a
              href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`Sineoda geri bildirim: ${item.title}`)}`}
              className="mt-2 inline-flex rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
            >
              Geri bildirimde bulunun
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-2 text-sm font-medium transition ${
        active ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function PlaySmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
