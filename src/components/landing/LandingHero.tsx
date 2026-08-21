import { Link } from 'react-router-dom'
import type { LandingHeroConfig } from '../../api/client'
import type { ContentItem } from '../../types/content'
import { resolveHeroBackground } from '../../utils/landingHeroMedia'

interface LandingHeroProps {
  hero: LandingHeroConfig
  backgroundContent: ContentItem | null
  featuredItem: ContentItem | null
  fallbackImage: string
}

export function LandingHero({
  hero,
  backgroundContent,
  featuredItem,
  fallbackImage,
}: LandingHeroProps) {
  const background = resolveHeroBackground(hero, backgroundContent, fallbackImage)
  const showFeaturedCard = hero.showFeaturedCard !== false && featuredItem

  return (
    <section className="relative min-h-[88dvh] overflow-hidden sm:min-h-dvh">
      <div className="absolute inset-0">
        {background.kind === 'video' ? (
          <video
            key={background.src}
            src={background.src}
            autoPlay
            muted
            loop
            playsInline
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

      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-sineoda-bg via-black/30 to-black/50" />

      <div className="relative mx-auto flex min-h-[88dvh] max-w-[1400px] flex-col items-center justify-center px-5 pb-20 pt-28 text-center sm:min-h-dvh sm:px-8">
        <h1 className="max-w-4xl font-semibold leading-[1.05] tracking-tight">
          <span className="block text-[2rem] text-white sm:text-5xl lg:text-6xl">{hero.line1}</span>
          <span className="mt-3 block text-[1.35rem] font-normal text-white/75 sm:text-3xl lg:text-4xl">
            {hero.line2}
          </span>
        </h1>

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-sineoda-muted sm:text-lg">
          {hero.description}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            to="/kayit"
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-md bg-sineoda-accent px-10 text-base font-semibold text-sineoda-bg transition hover:brightness-105"
          >
            {hero.ctaPrimary}
          </Link>
          <Link
            to="/giris"
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-md border border-white/20 px-10 text-base font-medium text-white/90 transition hover:border-white/35 hover:bg-white/5"
          >
            {hero.ctaSecondary}
          </Link>
        </div>

        <p className="mt-5 max-w-md text-xs leading-relaxed text-white/40">{hero.legalNote}</p>

        {showFeaturedCard && (
          <div className="mt-14 w-full max-w-xl rounded-xl border border-white/10 bg-black/35 px-5 py-4 text-left backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sineoda-accent">
              Bu hafta öne çıkan
            </p>
            <p className="mt-2 text-lg font-medium text-white">{featuredItem.title}</p>
            <p className="mt-1 text-sm text-sineoda-muted">
              {featuredItem.year} · {featuredItem.genres.slice(0, 2).join(', ')}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
