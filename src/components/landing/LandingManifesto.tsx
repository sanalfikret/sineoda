import { Link } from 'react-router-dom'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'
import { useLocale } from '../../i18n/LocaleContext'

export function LandingManifesto({
  section,
}: {
  section: LandingSectionsConfig['manifesto']
}) {
  const { localizePath } = useLocale()

  return (
    <section className="border-y border-white/[0.06] bg-plooy-surface px-5 py-12 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {section.pillars.map((pillar) => (
            <article key={pillar.title} className="max-w-lg">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {pillar.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-plooy-muted">{pillar.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 max-w-3xl border-t border-white/[0.06] pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-plooy-accent">
            {section.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            {section.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-plooy-muted sm:text-lg">{section.body}</p>
          <Link
            to={localizePath(section.ctaLink || '/kayit')}
            className="mt-6 inline-flex h-12 items-center rounded-md bg-plooy-accent px-8 text-sm font-semibold text-plooy-bg transition hover:brightness-105"
          >
            {section.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
