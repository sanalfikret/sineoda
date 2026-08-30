import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../../api/client'
import type { ContentItem } from '../../types/content'

export interface LandingShowcase {
  id: string
  title: string
  icon: string
  description: string
  items: ContentItem[]
}

interface LandingCategoryShowcaseProps {
  showcases: LandingShowcase[]
}

function ShowcaseIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? 'text-plooy-gold' : 'text-white/35'
  const stroke = 'currentColor'

  if (icon === 'dizi') {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="2" stroke={stroke} strokeWidth="1.5" />
        <path d="M8 21H16" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 17V21" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (icon === 'belgesel') {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
        <path d="M4 7H16C17.1 7 18 7.9 18 9V17C18 18.1 17.1 19 16 19H4V7Z" stroke={stroke} strokeWidth="1.5" />
        <path d="M18 9L21 7V19L18 17" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
  }

  if (icon === 'cocuk') {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.5" />
        <circle cx="9" cy="10" r="1" fill={stroke} />
        <circle cx="15" cy="10" r="1" fill={stroke} />
        <path d="M9 15C9.5 16.5 10.7 17.5 12 17.5C13.3 17.5 14.5 16.5 15 15" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (icon === 'dikey') {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2" stroke={stroke} strokeWidth="1.5" />
        <path d="M10 17H14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="1.5" />
      <path d="M12 4V2M12 22V20M4 12H2M22 12H20" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function posterSizeClass(item: ContentItem) {
  return item.videoFormat === 'vertical'
    ? 'h-[220px] w-[124px] sm:h-[280px] sm:w-[158px] md:h-[320px] md:w-[180px] lg:h-[360px] lg:w-[202px]'
    : 'h-[220px] w-[148px] sm:h-[280px] sm:w-[187px] md:h-[320px] md:w-[214px] lg:h-[360px] lg:w-[240px]'
}

export function LandingCategoryShowcase({ showcases }: LandingCategoryShowcaseProps) {
  const visibleShowcases = useMemo(
    () => showcases.filter((showcase) => showcase.items.length > 0),
    [showcases],
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [perPage, setPerPage] = useState(5)
  const scrollRef = useRef<HTMLDivElement>(null)

  const active = visibleShowcases[activeIndex] ?? visibleShowcases[0]

  useEffect(() => {
    if (activeIndex >= visibleShowcases.length) {
      setActiveIndex(Math.max(0, visibleShowcases.length - 1))
    }
  }, [activeIndex, visibleShowcases.length])

  const pages = useMemo(() => {
    if (!active) return []
    const chunks: ContentItem[][] = []
    for (let i = 0; i < active.items.length; i += perPage) {
      chunks.push(active.items.slice(i, i + perPage))
    }
    return chunks.length > 0 ? chunks : [[]]
  }, [active, perPage])

  const currentPageItems = pages[pageIndex] ?? []

  useEffect(() => {
    const updatePerPage = () => {
      const width = window.innerWidth
      if (width >= 1280) setPerPage(7)
      else if (width >= 1024) setPerPage(6)
      else if (width >= 768) setPerPage(5)
      else if (width >= 640) setPerPage(4)
      else setPerPage(3)
    }

    updatePerPage()
    window.addEventListener('resize', updatePerPage)
    return () => window.removeEventListener('resize', updatePerPage)
  }, [])

  useEffect(() => {
    setPageIndex(0)
    scrollRef.current?.scrollTo({ left: 0 })
  }, [activeIndex])

  useEffect(() => {
    setPageIndex(0)
  }, [perPage])

  if (visibleShowcases.length === 0) return null

  const goToPage = (index: number) => {
    const next = Math.max(0, Math.min(index, pages.length - 1))
    setPageIndex(next)
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
  }

  const scrollStrip = (direction: 'left' | 'right') => {
    if (direction === 'right' && pageIndex < pages.length - 1) {
      goToPage(pageIndex + 1)
      return
    }
    if (direction === 'left' && pageIndex > 0) {
      goToPage(pageIndex - 1)
    }
  }

  return (
    <section className="bg-black px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="text-center text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-[2rem]">
          Sınırsız Eğlence: Filmler, Diziler, Programlar ve Çok Daha Fazlası
        </h2>

        <div className="mt-10 flex flex-wrap items-end justify-center gap-x-8 gap-y-6 sm:gap-x-12 lg:gap-x-16">
          {visibleShowcases.map((showcase, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={showcase.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group flex flex-col items-center gap-2.5 pb-1 transition"
              >
                <ShowcaseIcon icon={showcase.icon} active={isActive} />
                <span
                  className={`text-sm font-semibold sm:text-base ${
                    isActive ? 'text-plooy-gold' : 'text-white/35 group-hover:text-white/60'
                  }`}
                >
                  {showcase.title}
                </span>
                <span
                  className={`h-0.5 w-full rounded-full transition ${
                    isActive ? 'bg-plooy-gold' : 'bg-transparent'
                  }`}
                />
              </button>
            )
          })}
        </div>

        {active.description && (
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-white/55 sm:text-base">
            {active.description}
          </p>
        )}

        <div className="relative mt-10 sm:mt-12">
          <p className="mb-4 text-left text-lg font-bold text-white sm:text-xl">{active.title}</p>

          <div className="relative">
            {pages.length > 1 && pageIndex > 0 && (
              <button
                type="button"
                onClick={() => scrollStrip('left')}
                className="absolute -left-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/80 p-2 text-white backdrop-blur-sm transition hover:bg-black sm:flex"
                aria-label="Önceki"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}

            {pages.length > 1 && pageIndex < pages.length - 1 && (
              <button
                type="button"
                onClick={() => scrollStrip('right')}
                className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/80 p-2 text-white backdrop-blur-sm transition hover:bg-black"
                aria-label="Sonraki"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}

            <div
              ref={scrollRef}
              className="hide-scrollbar flex gap-2 overflow-x-auto sm:gap-3"
            >
              {currentPageItems.length > 0 ? (
                currentPageItems.map((item) => (
                  <Link
                    key={item.id}
                    to="/kayit"
                    className="group relative shrink-0 overflow-hidden rounded-lg transition hover:scale-[1.02] hover:ring-1 hover:ring-plooy-gold/40"
                  >
                    <img
                      src={resolveMediaUrl(item.poster)}
                      alt={item.title}
                      className={`object-cover ${posterSizeClass(item)}`}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 pt-10">
                      <p className="line-clamp-2 text-left text-xs font-semibold text-white sm:text-sm">
                        {item.title}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex h-[220px] w-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/40">
                  Bu kategoride henüz içerik yok.
                </div>
              )}
            </div>
          </div>

          {pages.length > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {pages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToPage(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === pageIndex ? 'w-6 bg-plooy-gold' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Sayfa ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
