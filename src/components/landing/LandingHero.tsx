import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../../api/client'
import type { ContentItem } from '../../types/content'

interface LandingHeroProps {
  heroItem: ContentItem | null
  teaserPosters: string[]
  fallbackImage: string
}

export function LandingHero({ heroItem, teaserPosters, fallbackImage }: LandingHeroProps) {
  const heroImage = heroItem
    ? resolveMediaUrl(heroItem.backdrop || heroItem.poster)
    : fallbackImage

  return (
    <section className="relative min-h-[85dvh] overflow-hidden sm:min-h-dvh">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt=""
          className="landing-hero-image h-full w-full object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-sineoda-bg via-black/20 to-black/60" />

      {teaserPosters.length > 0 && (
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/40 to-black" />
          <div className="grid h-full grid-cols-2 gap-3 p-8 opacity-40">
            {teaserPosters.slice(0, 4).map((poster, index) => (
              <div
                key={poster}
                className={`overflow-hidden rounded-lg shadow-2xl ${index % 2 === 1 ? 'translate-y-8' : ''}`}
              >
                <img src={poster} alt="" className="h-full w-full object-cover blur-[1px]" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative mx-auto flex min-h-[85dvh] max-w-[1400px] flex-col items-center justify-center px-5 pb-16 pt-28 text-center sm:min-h-dvh sm:px-8">
        {heroItem && (
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="rounded bg-sineoda-gold/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-sineoda-gold">
              Öne Çıkan
            </span>
            <span className="text-sm text-white/60">{heroItem.year} · {heroItem.rating}</span>
          </div>
        )}

        <h1 className="max-w-4xl text-[2.25rem] font-extrabold leading-[1] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
          {heroItem ? (
            <>
              <span className="block text-white/90">{heroItem.title}</span>
              <span className="mt-3 block text-xl font-semibold text-white/55 sm:text-2xl lg:text-3xl">
                ve daha fazlası seni bekliyor.
              </span>
            </>
          ) : (
            'Sınırsız film, dizi ve daha fazlası.'
          )}
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
          Türkiye&apos;nin premium yayın platformu. Üye ol, profilini seç ve kişisel kataloğuna geç.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            to="/kayit"
            className="inline-flex h-14 min-w-[200px] items-center justify-center rounded-md bg-sineoda-gold px-10 text-base font-bold text-sineoda-bg transition hover:brightness-110"
          >
            Üye Ol
          </Link>
          <Link
            to="/giris"
            className="inline-flex h-14 min-w-[200px] items-center justify-center rounded-md border border-white/25 bg-white/5 px-10 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
          >
            Giriş Yap
          </Link>
        </div>

        <p className="mt-5 text-sm text-white/45">
          Zaten üye misin?{' '}
          <Link to="/giris" className="text-white underline underline-offset-2 hover:text-sineoda-gold">
            Giriş yap
          </Link>
        </p>
      </div>
    </section>
  )
}
