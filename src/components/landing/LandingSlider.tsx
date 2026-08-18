import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../../api/client'
import type { ContentItem } from '../../types/content'

interface LandingSliderProps {
  items: ContentItem[]
}

export function LandingSlider({ items }: LandingSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const activeItem = items[activeIndex]

  useEffect(() => {
    if (items.length === 0) return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [items.length])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.load()
    void video.play().catch(() => undefined)
  }, [activeIndex, activeItem?.id])

  if (items.length === 0) return null

  const trailerUrl = activeItem?.trailerUrl ? resolveMediaUrl(activeItem.trailerUrl) : ''
  const backdropUrl = resolveMediaUrl(activeItem.backdrop || activeItem.poster)

  const goTo = (index: number) => {
    setActiveIndex((index + items.length) % items.length)
  }

  return (
    <section className="relative bg-black px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-black sm:aspect-[21/9] lg:rounded-3xl">
          {trailerUrl ? (
            <video
              ref={videoRef}
              key={activeItem.id}
              src={trailerUrl}
              poster={backdropUrl}
              muted
              playsInline
              loop
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <img
              src={backdropUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8 lg:p-10">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sineoda-gold">
                Öne Çıkan
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                {activeItem.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm text-white/70 sm:text-base">
                {activeItem.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  to="/kayit"
                  className="inline-flex items-center justify-center rounded-md bg-sineoda-gold px-6 py-2.5 text-sm font-bold text-sineoda-bg transition hover:brightness-110"
                >
                  Üye Ol
                </Link>
                <span className="text-sm text-white/50">
                  {activeItem.year} · {activeItem.rating}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:max-w-[45%]">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    index === activeIndex
                      ? 'border-sineoda-gold scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  aria-label={item.title}
                >
                  <img
                    src={resolveMediaUrl(item.poster)}
                    alt=""
                    className="h-16 w-11 object-cover sm:h-20 sm:w-14 lg:h-24 lg:w-16"
                  />
                </button>
              ))}
            </div>
          </div>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70 sm:block"
                aria-label="Önceki"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70 sm:block"
                aria-label="Sonraki"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </>
          )}

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-5">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? 'w-6 bg-sineoda-gold' : 'w-2 bg-white/40'
                }`}
                aria-label={`Slayt ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
