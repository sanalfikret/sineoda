import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resolveMediaUrl, type LandingHeroConfig } from '../../api/client'
import type { ContentItem } from '../../types/content'
import { useLocale } from '../../i18n/LocaleContext'
import { resolveHeroBackground } from '../../utils/landingHeroMedia'

interface LandingHeroProps {
  items?: ContentItem[]
  hero: LandingHeroConfig
  backgroundContent: ContentItem | null
  featuredItem: ContentItem | null
  fallbackImage: string
}

export function LandingHero({
  hero,
  items = [],
  backgroundContent,
  featuredItem,
  fallbackImage,
}: LandingHeroProps) {
  const { t } = useTranslation('landing')
  const { localizePath } = useLocale()
  const slides = [featuredItem, ...items].filter((item, index, all): item is ContentItem => !!item && all.findIndex(other => other?.id === item.id) === index)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => { if (paused || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const timer = window.setInterval(() => setIndex(i => (i + 1) % slides.length), 9000); return () => window.clearInterval(timer) }, [paused, slides.length])
  const active = slides[index % Math.max(1, slides.length)] ?? null
  const background = resolveHeroBackground(index === 0 ? hero : { ...hero, backgroundImage: '', backgroundVideo: '' }, active ?? backgroundContent, fallbackImage)
  const showFeaturedCard = hero.showFeaturedCard !== false && featuredItem

  return (
    <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} className="relative mx-3 mt-20 min-h-[72dvh] overflow-hidden rounded-2xl sm:mx-8 sm:min-h-[80dvh]">
      <div className="absolute inset-0" style={{ backgroundImage: `url(${resolveMediaUrl(hero.backgroundImage || active?.backdrop || active?.poster || fallbackImage)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {background.kind === 'video' ? (
          <video
            key={background.src}
            src={background.src}
            autoPlay
            muted
            loop
            playsInline
            poster={resolveMediaUrl(hero.backgroundImage || active?.backdrop || active?.poster || fallbackImage)}
            onError={e => { e.currentTarget.style.opacity = '0' }}
            className="landing-hero-image h-full w-full object-cover opacity-90"
          />
        ) : (
          <img
            key={background.src}
            src={background.src}
            alt=""
            className="landing-hero-image h-full w-full object-cover opacity-90"
          />
        )}
      </div>

      <div className="absolute inset-0 bg-black/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/10" />

      <div className="relative mx-auto flex min-h-[72dvh] max-w-[1600px] flex-col items-start justify-end px-6 pb-16 pt-28 text-left sm:min-h-[80dvh] sm:px-12">
        <h1 className="max-w-4xl font-semibold leading-[1.05] tracking-tight">
          <span className="block text-[2rem] text-white sm:text-5xl lg:text-6xl">{active?.title || hero.line1}</span>
          <span className="mt-3 block text-[1.35rem] font-normal text-white/75 sm:text-3xl lg:text-4xl">
            {active ? [active.year, active.rating, active.duration, ...active.genres.slice(0, 2)].filter(Boolean).join(' · ') : hero.line2}
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-plooy-muted sm:text-lg">
          {active?.description || hero.description}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            to={localizePath(hero.ctaPrimaryLink || '/kayit')}
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-md bg-plooy-accent px-10 text-base font-semibold text-plooy-bg transition hover:brightness-105"
          >
            {hero.ctaPrimary}
          </Link>
          <Link
            to={localizePath(hero.ctaSecondaryLink || '/giris')}
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-md border border-white/20 px-10 text-base font-medium text-white/90 transition hover:border-white/35 hover:bg-white/5"
          >
            {hero.ctaSecondary}
          </Link>
        </div>

        <p className="mt-5 max-w-md text-xs leading-relaxed text-white/40">{hero.legalNote}</p>

        {showFeaturedCard && !active && (
          <div className="mt-14 w-full max-w-xl rounded-xl border border-white/10 bg-black/35 px-5 py-4 text-left backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-plooy-accent">
              {t('hero.featuredThisWeek')}
            </p>
            <p className="mt-2 text-lg font-medium text-white">{featuredItem.title}</p>
            <p className="mt-1 text-sm text-plooy-muted">
              {featuredItem.year} · {featuredItem.genres.slice(0, 2).join(', ')}
            </p>
          </div>
        )}
        {slides.length > 1 && <div className="mt-5 flex flex-wrap gap-2">{slides.map((item, i) => <button key={item.id} type="button" aria-label={item.title} aria-pressed={index === i} onClick={() => { setIndex(i); setPaused(true) }} className={'h-2 rounded-full transition-all ' + (index === i ? 'w-10 bg-white' : 'w-5 bg-white/40')} />)}</div>}
      </div>
    </section>
  )
}
