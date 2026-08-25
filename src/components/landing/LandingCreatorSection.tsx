import { Link } from 'react-router-dom'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'

export function LandingCreatorSection({ section }: { section: LandingSectionsConfig['creator'] }) {
  return (
    <section id="yapimcilar" className="relative overflow-hidden border-t border-sineoda-gold/30 bg-[#0a0c10]">
      <div className="relative mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sineoda-gold">
            {section.eyebrow}
          </p>
          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            {section.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            {section.subtitle}
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {section.perks.map((perk, index) => (
            <article
              key={perk.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
            >
              <span className="text-3xl font-bold text-sineoda-gold/40">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{perk.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{perk.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to={section.ctaPrimaryLink || '/creator/kayit'}
            className="inline-flex h-14 min-w-[240px] items-center justify-center rounded-lg bg-sineoda-gold px-10 text-base font-bold text-sineoda-bg shadow-lg shadow-sineoda-gold/20 transition hover:brightness-110"
          >
            {section.ctaPrimary}
          </Link>
          <Link
            to={section.ctaSecondaryLink || '/creator/giris'}
            className="inline-flex h-14 min-w-[240px] items-center justify-center rounded-lg border border-white/20 bg-white/5 px-10 text-base font-semibold text-white backdrop-blur-sm transition hover:border-sineoda-gold/50 hover:bg-white/10"
          >
            {section.ctaSecondary}
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-white/35">{section.footnote}</p>
      </div>
    </section>
  )
}
