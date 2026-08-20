import { Link } from 'react-router-dom'
import { BRAND_CREATOR } from '../constants/brand'

export function CreatorFooterBar() {
  return (
    <section className="border-t border-sineoda-gold/20 bg-gradient-to-r from-[#141820] via-[#1a1520] to-[#141820] px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sineoda-gold">
              {BRAND_CREATOR.eyebrow}
            </p>
            <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">{BRAND_CREATOR.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-sineoda-muted">{BRAND_CREATOR.subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3">
            <Link
              to="/creator/kayit"
              className="rounded-lg bg-sineoda-gold px-6 py-3 text-sm font-bold text-sineoda-bg transition hover:brightness-110"
            >
              {BRAND_CREATOR.ctaPrimary}
            </Link>
            <Link
              to="/creator/giris"
              className="rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-sineoda-gold/40 hover:text-sineoda-gold"
            >
              {BRAND_CREATOR.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
