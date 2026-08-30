import { TrailerBackdrop } from './TrailerBackdrop'
import type { ContentItem } from '../types/content'

interface HeroProps {
  item: ContentItem
  onPlay: (item: ContentItem) => void
  onDetails: (item: ContentItem) => void
  eyebrow?: string
}

export function Hero({ item, onPlay, onDetails, eyebrow = 'Öne Çıkan' }: HeroProps) {
  return (
    <section className="relative min-h-[58vh] overflow-hidden sm:min-h-[72vh] lg:min-h-[88vh] tv:min-h-[85vh]">
      <TrailerBackdrop item={item} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,184,74,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-plooy-bg via-plooy-bg/90 to-plooy-bg/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-plooy-bg via-plooy-bg/30 to-black/20" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-plooy-gold/40 to-transparent" />

      <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-10 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8 lg:pb-20 tv:pb-24 tv:pt-32">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex max-w-full flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-plooy-gold sm:mb-4 sm:text-sm sm:tracking-[0.28em]">
            <span className="h-px w-8 bg-plooy-gold/70" />
            {eyebrow}
            {item.isNew && (
              <span className="rounded-full bg-plooy-gold px-2.5 py-0.5 text-[10px] font-bold tracking-normal text-plooy-bg">
                YENİ
              </span>
            )}
          </p>
          <h1 className="text-3xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-7xl tv:text-7xl">
            {item.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/75">
            <span className="rounded border border-plooy-gold/30 bg-plooy-gold/10 px-2.5 py-0.5 text-xs font-semibold text-plooy-gold">
              {item.rating}
            </span>
            <span>{item.year}</span>
            <span className="text-white/40">•</span>
            <span>{item.duration}</span>
            <span className="text-white/40">•</span>
            <span className="capitalize">{item.type}</span>
            {item.videoFormat === 'vertical' && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-plooy-gold">Dikey Dizi</span>
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.genres.slice(0, 4).map((genre) => (
              <span key={genre} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/85">
                {genre}
              </span>
            ))}
          </div>
          <p className="mt-4 max-w-2xl line-clamp-3 text-sm leading-relaxed text-white/80 sm:mt-5 sm:line-clamp-none sm:text-lg">
            {item.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
            <button
              type="button"
              onClick={() => onPlay(item)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-plooy-gold px-4 text-sm font-semibold text-plooy-bg shadow-lg shadow-plooy-gold/20 transition hover:brightness-110 sm:h-auto sm:min-h-11 sm:gap-2 sm:px-6 sm:py-3.5"
            >
              <PlayIcon />
              {item.videoFormat === 'vertical' ? 'Dikey İzle' : 'Oynat'}
            </button>
            {item.trailerUrl && (
              <button
                type="button"
                onClick={() => onDetails(item)}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:h-auto sm:min-h-11 sm:gap-2 sm:px-6 sm:py-3.5"
              >
                <InfoIcon />
                Fragman & Detay
              </button>
            )}
            {!item.trailerUrl && (
              <button
                type="button"
                onClick={() => onDetails(item)}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:h-auto sm:min-h-11 sm:gap-2 sm:px-6 sm:py-3.5"
              >
                <InfoIcon />
                Detaylar
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
