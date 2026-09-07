import { useTranslation } from 'react-i18next'
import { TrailerBackdrop } from './TrailerBackdrop'
import type { ContentItem } from '../types/content'
import { useBrowseLabels } from '../i18n/useBrowseLabels'

interface HeroProps {
  item: ContentItem
  onPlay: (item: ContentItem) => void
  onDetails: (item: ContentItem) => void
  eyebrow?: string
}

export function Hero({ item, onPlay, onDetails, eyebrow }: HeroProps) {
  const { t } = useTranslation('content')
  const { translateGenre, translateRating, translateDuration, translateContentType } = useBrowseLabels()
  const eyebrowLabel = eyebrow ?? t('hero.featured')

  return (
    <section className="relative mx-3 mt-20 min-h-[65dvh] overflow-hidden rounded-2xl border border-white/10 sm:mx-8 sm:min-h-[78dvh] lg:mx-12 tv:min-h-[85vh]">
      <TrailerBackdrop item={item} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,184,74,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-plooy-gold/40 to-transparent" />

      <div className="relative flex min-h-[65dvh] w-full items-end px-6 pb-10 pt-24 sm:min-h-[78dvh] sm:px-10 sm:pb-12 lg:px-12 tv:min-h-[85vh] tv:pb-24">
        <div className="max-w-2xl">
          <p className="mb-3 inline-flex max-w-full flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-plooy-gold sm:mb-4 sm:text-sm sm:tracking-[0.28em]">
            <span className="h-px w-8 bg-plooy-gold/70" />
            {eyebrowLabel}
            {item.isNew && (
              <span className="rounded-full bg-plooy-gold px-2.5 py-0.5 text-[10px] font-bold tracking-normal text-plooy-bg">
                {t('hero.newBadge')}
              </span>
            )}
          </p>
          <h1 className="text-3xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-7xl tv:text-7xl">
            {item.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/75">
            <span className="rounded border border-plooy-gold/30 bg-plooy-gold/10 px-2.5 py-0.5 text-xs font-semibold text-plooy-gold">
              {translateRating(item.rating)}
            </span>
            <span>{item.year}</span>
            <span className="text-white/40">•</span>
            <span>{translateDuration(item.duration)}</span>
            <span className="text-white/40">•</span>
            <span>{translateContentType(item.type)}</span>
            {item.videoFormat === 'vertical' && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-plooy-gold">{t('hero.verticalSeries')}</span>
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.genres.slice(0, 4).map((genre) => (
              <span key={genre} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/85">
                {translateGenre(genre)}
              </span>
            ))}
          </div>
          <p className="mt-4 max-w-2xl line-clamp-3 text-sm leading-relaxed text-white/80 sm:mt-5 sm:line-clamp-3 sm:text-lg">
            {item.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
            <button
              type="button"
              onClick={() => onPlay(item)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-plooy-gold px-4 text-sm font-semibold text-plooy-bg shadow-lg shadow-plooy-gold/20 transition hover:brightness-110 sm:h-auto sm:min-h-11 sm:gap-2 sm:px-6 sm:py-3.5"
            >
              <PlayIcon />
              {item.videoFormat === 'vertical' ? t('hero.playVertical') : t('hero.play')}
            </button>
            {item.trailerUrl && (
              <button
                type="button"
                onClick={() => onDetails(item)}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:h-auto sm:min-h-11 sm:gap-2 sm:px-6 sm:py-3.5"
              >
                <InfoIcon />
                {t('hero.trailerAndDetails')}
              </button>
            )}
            {!item.trailerUrl && (
              <button
                type="button"
                onClick={() => onDetails(item)}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:h-auto sm:min-h-11 sm:gap-2 sm:px-6 sm:py-3.5"
              >
                <InfoIcon />
                {t('hero.details')}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10v6M12 7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
