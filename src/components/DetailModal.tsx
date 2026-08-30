import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchEpisodes, fetchWatchProgress, resolveMediaUrl } from '../api/client'
import type { ContentItem, Episode } from '../types/content'
import { FEEDBACK_EMAIL } from '../constants/site'
import { BRAND_NAME } from '../constants/brand'
import { getContentTypeLabel, hasEpisodicContent } from '../constants/contentTypes'
import { sortEpisodes } from '../utils/episodes'
import { ContentActionButtons } from './ContentActionButtons'
import { SeriesEpisodeSection } from './SeriesEpisodeSection'
import { StudentCinemaMetaDetails } from './StudentCinemaMetaDetails'
import { getStudentDisplayName } from '../utils/studentDisplayName'
import { TermsAcceptanceNote } from './TermsAcceptanceNote'

interface DetailModalProps {
  item: ContentItem | null
  onClose: () => void
  onPlay: (item: ContentItem, episode?: Episode) => void
}

type DetailTab = 'overview' | 'details'

function formatResumeTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  return `${mins} dk`
}

function CreditList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-plooy-muted">{label}</p>
      <p className="mt-1 text-sm text-white/90">{items.join(', ')}</p>
    </div>
  )
}

export function DetailModal({ item, onClose, onPlay }: DetailModalProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [season, setSeason] = useState(1)
  const [resumePosition, setResumePosition] = useState<number | null>(null)
  const [tab, setTab] = useState<DetailTab>('overview')

  useEffect(() => {
    if (!item || !hasEpisodicContent(item)) {
      setEpisodes([])
      return
    }

    fetchEpisodes(item.id)
      .then((data) => {
        const sorted = sortEpisodes(data.episodes)
        setEpisodes(sorted)
        setSeason(sorted[0]?.season ?? 1)
      })
      .catch(() => setEpisodes([]))
  }, [item])

  useEffect(() => {
    if (!item) {
      setResumePosition(null)
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

  const sortedEpisodes = useMemo(() => sortEpisodes(episodes), [episodes])
  const isSeries = item ? hasEpisodicContent(item) : false
  const firstEpisode = sortedEpisodes.find((episode) => episode.videoUrl?.trim()) ?? sortedEpisodes[0]
  const hasEpisodeVideo = sortedEpisodes.some((episode) => episode.videoUrl?.trim())
  const hasMainVideo = Boolean(item?.videoUrl?.trim())
  const canPlay = hasEpisodeVideo || hasMainVideo
  const canResume = resumePosition !== null && resumePosition > 10
  const credits = item?.credits ?? {}
  const audioLanguages = credits.audioLanguages ?? ['Türkçe']
  const subtitleLanguages =
    credits.subtitleLanguages ??
    (item?.subtitles?.length
      ? item.subtitles.map((track) => track.label || track.lang)
      : ['Türkçe'])

  if (!item) return null

  return (
    <div
      className="safe-top safe-bottom fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-plooy-surface sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="relative aspect-video w-full overflow-hidden sm:rounded-t-3xl">
          <img src={resolveMediaUrl(item.backdrop)} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-plooy-surface via-transparent to-black/30" />
          {item.isNew && (
            <span className="absolute left-4 top-4 rounded bg-plooy-gold px-2.5 py-1 text-xs font-bold text-plooy-bg">
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
          {item.program === 'student_cinema' && (item.schoolName || getStudentDisplayName(item)) ? (
            <p className="mt-2 text-sm text-emerald-200/90">
              {[getStudentDisplayName(item), item.schoolName].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-plooy-muted">
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
              {item.rating}
            </span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white">
              {getContentTypeLabel(item.type)}
            </span>
            {item.videoFormat === 'vertical' && (
              <span className="rounded bg-plooy-gold/20 px-2 py-0.5 text-xs text-plooy-gold">
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-3">
            {canResume && !isSeries && (
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="inline-flex items-center gap-2 rounded-lg bg-plooy-gold px-5 py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110"
              >
                <PlaySmallIcon />
                Kaldığın Yerden Devam ({formatResumeTime(resumePosition)})
              </button>
            )}

            {!canResume && isSeries && firstEpisode && hasEpisodeVideo && (
              <button
                type="button"
                onClick={() => onPlay(item, firstEpisode)}
                className="inline-flex items-center gap-2 rounded-lg bg-plooy-gold px-5 py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110"
              >
                <PlaySmallIcon />
                {item.videoFormat === 'vertical' ? 'Dikey İzlemeye Başla' : '1. Bölümü Oynat'}
              </button>
            )}

            {!canResume && isSeries && !hasEpisodeVideo && hasMainVideo && (
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="inline-flex items-center gap-2 rounded-lg bg-plooy-gold px-5 py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110"
              >
                <PlaySmallIcon />
                {item.videoFormat === 'vertical' ? 'Dikey İzle' : 'Oynat'}
              </button>
            )}

            {!canResume && !isSeries && hasMainVideo && (
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="inline-flex items-center gap-2 rounded-lg bg-plooy-gold px-5 py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110"
              >
                <PlaySmallIcon />
                Oynat
              </button>
            )}

            {!canResume && !canPlay && (
              <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-plooy-muted">
                Bu içerik için henüz video eklenmemiş. Admin panelinden video URL&apos;si ve bölümleri
                ekleyebilirsiniz.
              </p>
            )}

            <ContentActionButtons contentId={item.id} title={item.title} />
            </div>
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

              {isSeries && episodes.length > 0 && (
                <SeriesEpisodeSection
                  item={item}
                  episodes={episodes}
                  onPlay={onPlay}
                  compact
                  initialSeason={season}
                />
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
                {item.program === 'student_cinema' && item.schoolName ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-plooy-muted">Okul</p>
                    <p className="mt-1 text-sm text-white/90">{item.schoolName}</p>
                  </div>
                ) : null}
                {credits.studio && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-plooy-muted">Stüdyo</p>
                    <p className="mt-1 text-sm text-white/90">{credits.studio}</p>
                  </div>
                )}
                {!credits.directors?.length &&
                  !credits.producers?.length &&
                  !credits.cast?.length &&
                  !credits.studio && (
                    <p className="text-sm text-plooy-muted">Bu içerik için künye bilgisi henüz eklenmedi.</p>
                  )}
              </div>

              <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-plooy-muted">
                    Seslendirme Dilleri
                  </p>
                  <p className="mt-1 text-sm text-white/90">{audioLanguages.join(', ')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-plooy-muted">Alt Yazılar</p>
                  <p className="mt-1 text-sm text-white/90">{subtitleLanguages.join(', ')}</p>
                </div>
                <StudentCinemaMetaDetails item={item} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-plooy-muted">
                    İçerik Danışma
                  </p>
                  <p className="mt-1 text-sm text-white/90">{item.rating}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
            <TermsAcceptanceNote />
            <div>
              <p className="text-sm font-medium text-white">Geri bildirim</p>
              <a
                href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`${BRAND_NAME} geri bildirim: ${item.title}`)}`}
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

function PlaySmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
