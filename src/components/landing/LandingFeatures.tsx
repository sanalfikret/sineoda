import { useTranslation } from 'react-i18next'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'

export function LandingFeatures({ section: _section }: { section: LandingSectionsConfig['features'] }) {
  const { t } = useTranslation('landing')
  const items = t('features.items', { returnObjects: true }) as Array<{ title: string; text: string }>

  return (
    <section className="border-y border-white/[0.06] bg-plooy-bg px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-plooy-accent">
            {t('features.eyebrow')}
          </p>
          <h2 className="mt-4 whitespace-pre-line text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t('features.title')}
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-white/[0.06] bg-plooy-surface/60 p-6"
            >
              <h3 className="text-base font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-plooy-muted">{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
