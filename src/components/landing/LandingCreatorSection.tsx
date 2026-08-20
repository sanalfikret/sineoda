import { Link } from 'react-router-dom'
import { BRAND_CREATOR } from '../../constants/brand'

export function LandingCreatorSection() {
  return (
    <section
      id="yapimcilar"
      className="relative overflow-hidden border-t border-sineoda-gold/30 bg-[#0a0c10]"
    >
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-sineoda-gold/10 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-purple-900/20 blur-[90px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,184,74,0.06),transparent_65%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sineoda-gold">
            {BRAND_CREATOR.eyebrow}
          </p>
          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            {BRAND_CREATOR.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            {BRAND_CREATOR.subtitle}
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_CREATOR.perks.map((perk, index) => (
            <article
              key={perk.title}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition hover:border-sineoda-gold/30 hover:bg-white/[0.05]"
            >
              <span className="text-3xl font-bold text-sineoda-gold/40 transition group-hover:text-sineoda-gold/70">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{perk.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{perk.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/creator/kayit"
            className="inline-flex h-14 min-w-[240px] items-center justify-center rounded-lg bg-sineoda-gold px-10 text-base font-bold text-sineoda-bg shadow-lg shadow-sineoda-gold/20 transition hover:brightness-110"
          >
            {BRAND_CREATOR.ctaPrimary}
          </Link>
          <Link
            to="/creator/giris"
            className="inline-flex h-14 min-w-[240px] items-center justify-center rounded-lg border border-white/20 bg-white/5 px-10 text-base font-semibold text-white backdrop-blur-sm transition hover:border-sineoda-gold/50 hover:bg-white/10"
          >
            {BRAND_CREATOR.ctaSecondary}
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-white/35">
          Bağımsız sinemanın buluşma noktası — izleyici tarafında keşfet, yapımcı tarafında yayınla.
        </p>
      </div>
    </section>
  )
}
