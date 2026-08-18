import { useRef, useState } from 'react'
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
  const color = active ? 'text-sineoda-gold' : 'text-white/40'
  const stroke = 'currentColor'

  if (icon === 'dizi') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="2" stroke={stroke} strokeWidth="1.5" />
        <path d="M8 21H16" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 17V21" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (icon === 'belgesel') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
        <path d="M4 7H16C17.1 7 18 7.9 18 9V17C18 18.1 17.1 19 16 19H4V7Z" stroke={stroke} strokeWidth="1.5" />
        <path d="M18 9L21 7V19L18 17" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
  }

  if (icon === 'cocuk') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.5" />
        <circle cx="9" cy="10" r="1" fill={stroke} />
        <circle cx="15" cy="10" r="1" fill={stroke} />
        <path d="M9 15C9.5 16.5 10.7 17.5 12 17.5C13.3 17.5 14.5 16.5 15 15" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (icon === 'dikey') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2" stroke={stroke} strokeWidth="1.5" />
        <path d="M10 17H14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={color} aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="1.5" />
      <path d="M12 4V2M12 22V20M4 12H2M22 12H20" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function LandingCategoryShowcase({ showcases }: LandingCategoryShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (showcases.length === 0) return null

  const active = showcases[activeIndex] ?? showcases[0]

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current
    if (!container) return
    const amount = direction === 'left' ? -container.clientWidth * 0.8 : container.clientWidth * 0.8
    container.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="bg-sineoda-bg px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Sınırsız Eğlence: Filmler, Diziler, Programlar ve Çok Daha Fazlası
        </h2>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 lg:gap-14">
          {showcases.map((showcase, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={showcase.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group flex flex-col items-center gap-3 transition"
              >
                <ShowcaseIcon icon={showcase.icon} active={isActive} />
                <span
                  className={`text-sm font-semibold sm:text-base ${
                    isActive ? 'text-sineoda-gold' : 'text-white/40 group-hover:text-white/70'
                  }`}
                >
                  {showcase.title}
                </span>
              </button>
            )
          })}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
          {active.description}
        </p>

        <div className="relative mt-10">
          {active.items.length > 1 && (
            <button
              type="button"
              onClick={() => scroll('right')}
              className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/70 p-2 text-white backdrop-blur-sm transition hover:bg-black sm:flex"
              aria-label="Kaydır"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}

          <div
            ref={scrollRef}
            className="hide-scrollbar flex gap-3 overflow-x-auto pb-2 sm:gap-4 lg:gap-5"
          >
            {active.items.map((item) => (
              <Link
                key={item.id}
                to="/kayit"
                className="group relative shrink-0 overflow-hidden rounded-xl transition hover:scale-[1.03]"
              >
                <img
                  src={resolveMediaUrl(item.poster)}
                  alt={item.title}
                  className="h-44 w-28 object-cover sm:h-56 sm:w-36 md:h-64 md:w-44 lg:h-72 lg:w-48"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                <p className="absolute inset-x-0 bottom-0 p-3 text-left text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 sm:text-sm">
                  {item.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
