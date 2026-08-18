import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resolveMediaUrl } from '../../api/client'
import type { ContentItem } from '../../types/content'

interface LandingHeroProps {
  heroItem: ContentItem | null
  teaserPosters: string[]
  fallbackImage: string
}

export function LandingHero({ heroItem, teaserPosters, fallbackImage }: LandingHeroProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const heroImage = heroItem
    ? resolveMediaUrl(heroItem.backdrop || heroItem.poster)
    : fallbackImage

  const handleEmailSubmit = (event: FormEvent) => {
    event.preventDefault()
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''
    navigate(`/kayit${query}`)
  }

  return (
    <section className="relative min-h-dvh overflow-hidden">
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

      <div className="relative mx-auto flex min-h-dvh max-w-[1400px] flex-col justify-center px-5 pb-16 pt-28 sm:px-8">
        {heroItem && (
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded bg-sineoda-gold/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-sineoda-gold">
              Öne Çıkan
            </span>
            <span className="text-sm text-white/60">{heroItem.year} · {heroItem.rating}</span>
          </div>
        )}

        <h1 className="max-w-4xl text-[2.75rem] font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
          {heroItem ? (
            <>
              <span className="block text-white/90">{heroItem.title}</span>
              <span className="mt-2 block text-2xl font-semibold text-white/55 sm:text-3xl lg:text-4xl">
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

        <form onSubmit={handleEmailSubmit} className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-posta adresin"
            className="h-14 flex-1 rounded-md border border-white/20 bg-black/50 px-4 text-base text-white outline-none backdrop-blur-sm placeholder:text-white/40 focus:border-white"
          />
          <button
            type="submit"
            className="h-14 rounded-md bg-sineoda-gold px-8 text-base font-bold text-sineoda-bg transition hover:brightness-110"
          >
            Başla
          </button>
        </form>

        <p className="mt-3 text-sm text-white/45">
          Hazır mısın?{' '}
          <Link to="/kayit" className="text-white underline underline-offset-2 hover:text-sineoda-gold">
            Üyeliğe hemen başla
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
