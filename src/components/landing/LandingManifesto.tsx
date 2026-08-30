import { Link } from 'react-router-dom'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'

export function LandingManifesto({
  section,
}: {
  section: LandingSectionsConfig['manifesto']
}) {
  return (
    <section className="border-y border-white/[0.06] bg-plooy-surface px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          {section.pillars.map((pillar) => (
            <article key={pillar.title} className="max-w-lg">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {pillar.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-plooy-muted">{pillar.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-20 max-w-3xl border-t border-white/[0.06] pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-plooy-accent">
            {section.eyebrow}
          </p>
          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            {section.title}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-plooy-muted sm:text-lg">
            {section.body}
          </p>
          <Link
            to={section.ctaLink}
            className="mt-8 inline-flex h-12 items-center rounded-md bg-plooy-accent px-8 text-sm font-semibold text-plooy-bg transition hover:brightness-105"
          >
            {section.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
