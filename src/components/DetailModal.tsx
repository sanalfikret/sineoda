import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fetchEpisodes, fetchReaction, fetchWatchProgress, resolveMediaUrl, setReaction } from '../api/client'
import type { ContentItem, Episode } from '../types/content'
import { useWatchlist } from '../context/WatchlistContext'
import { FEEDBACK_EMAIL } from '../constants/site'
import { getContentTypeLabel, isSeriesContent } from '../constants/contentTypes'
import { shareContent } from '../utils/share'

interface DetailModalProps {
  item: ContentItem | null
  onClose: () => void
  onPlay: (item: ContentItem, episode?: Episode) => void
}

type DetailTab = 'overview' | 'details'
type Reaction = 'like' | 'dislike' | null

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

export function DetailModal({ item, onClose, onPlay }: DetailModalProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist()
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [season, setSeason] = useState(1)
  const [resumePosition, setResumePosition] = useState<number | null>(null)
  const [tab, setTab] = useState<DetailTab>('overview')
  const [reaction, setReactionState] = useState<Reaction>(null)
  const [reactionLoading, setReactionLoading] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)

  useEffect(() => {
    if (!item || !isSeriesContent(item.type)) {
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
      setReactionState(null)
      setTab('overview')
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
        } else {
          setResumePosition(null)
        }
      })
      .catch(() => setResumePosition(null))

    fetchReaction(item.id)
      .then(({ reaction: value }) => setReactionState(value))
      .catch(() => setReactionState(null))
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
  const credits = item.credits ?? {}
  const audioLanguages = credits.audioLanguages ?? ['Türkçe']
  const subtitleLanguages =
    credits.subtitleLanguages ??
    (item.subtitles?.length
      ? item.subtitles.map((track) => track.label || track.lang)
      : ['Türkçe'])

  const handleReaction = async (next: Reaction) => {
    if (reactionLoading) return
    const value = reaction === next ? null : next
    setReactionLoading(true)
    try {
      const result = await setReaction(item.id, value)
      setReactionState(result.reaction)
    } catch {
      // sessizce geç
    } finally {
      setReactionLoading(false)
    }
  }

  const handleShare = async () => {
    if (shareBusy) return
    setShareBusy(true)
    try {
      await shareContent(item.title, item.id)
    } finally {
      setShareBusy(false)
    }
  }

  return (
    <div
      className="safe-top safe-bottom fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-sineoda-surface sm:rounded-3xl"
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
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white">
              {getContentTypeLabel(item.type)}
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

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {canResume && !isSeriesContent(item.type) && (
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
              >
                <PlaySmallIcon />
                Kaldığın Yerden Devam ({formatResumeTime(resumePosition)})
              </button>
            )}

            {!canResume && isSeriesContent(item.type) && episodes.length > 0 && firstEpisode && (
              <button
                type="button"
                onClick={() => onPlay(item, firstEpisode)}
                className="inline-flex items-center gap-2 rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
              >
                <PlaySmallIcon />
                1. Bölümü Oynat
              </button>
            )}

            {!canResume && !isSeriesContent(item.type) && (
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
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                inList
                  ? 'border-sineoda-gold bg-sineoda-gold/10 text-sineoda-gold'
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
              aria-label={inList ? 'Listeden çıkar' : 'Listeme ekle'}
              title={inList ? 'Listemde' : 'Listeme ekle'}
            >
              {inList ? '✓' : '+'}
            </button>

            <ActionIconButton
              label="Beğen"
              active={reaction === 'like'}
              disabled={reactionLoading}
              onClick={() => void handleReaction('like')}
            >
              <ThumbsUpIcon />
            </ActionIconButton>

            <ActionIconButton
              label="Beğenme"
              active={reaction === 'dislike'}
              disabled={reactionLoading}
              onClick={() => void handleReaction('dislike')}
            >
              <ThumbsDownIcon />
            </ActionIconButton>

            <ActionIconButton
              label="Paylaş"
              disabled={shareBusy}
              onClick={() => void handleShare()}
            >
              <ShareIcon />
            </ActionIconButton>
          </div>

          <div className="mt-6 flex gap-4 border-b border-white/10">
            <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
              Özet
            </TabButton>
            <TabButton active={tab === 'details'} onClick={() => setTab('details')}>
              Ayrıntılar
            </TabButton>
          </div>

          {tab === 'overview' && (
            <>
              <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
                {item.description}
              </p>

              {isSeriesContent(item.type) && episodes.length > 0 && (
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
                {!credits.directors?.length &&
                  !credits.producers?.length &&
                  !credits.cast?.length &&
                  !credits.studio && (
                    <p className="text-sm text-sineoda-muted">Bu içerik için künye bilgisi henüz eklenmedi.</p>
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
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-muted">
                    İçerik Danışma
                  </p>
                  <p className="mt-1 text-sm text-white/90">{item.rating}</p>
                </div>
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

function ActionIconButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition disabled:opacity-50 ${
        active
          ? 'border-sineoda-gold bg-sineoda-gold/15 text-sineoda-gold'
          : 'border-white/20 text-white hover:bg-white/10'
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

function ThumbsUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 10v12M7 10l4-6 2 4h6a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-4l-1 5H7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ThumbsDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17 14V2M17 14l-4 6-2-4H5a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h4l1 5h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.6 10.7l6.8-3.9M8.6 13.3l6.8 3.9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
