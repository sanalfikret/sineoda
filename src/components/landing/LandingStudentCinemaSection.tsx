import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'

export function LandingStudentCinemaSection({
  section,
}: {
  section: LandingSectionsConfig['studentCinema']
}) {
  const stepsRef = useRef<HTMLDivElement>(null)

  return (
    <section
      id="genc-sinema"
      className="relative overflow-hidden border-t border-white/10 bg-[#0b0e14]"
    >
      <div className="relative mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/90">
            {section.eyebrow}
          </p>
          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            {section.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            {section.subtitle}
          </p>
        </div>

        <div ref={stepsRef} id="nasil-calisir" className="mt-16 scroll-mt-28">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
            {section.stepsHeading}
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {section.steps.map((step, index) => (
              <article
                key={`${step.title}-${index}`}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
              >
                <span className="text-2xl font-bold text-emerald-400/70">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{step.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/creator/kayit?program=genc-sinema"
            className="inline-flex h-14 min-w-[240px] items-center justify-center rounded-lg bg-emerald-500 px-10 text-base font-bold text-[#07110d] shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
          >
            {section.ctaPrimary}
          </Link>
          <button
            type="button"
            onClick={() => stepsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex h-14 min-w-[240px] items-center justify-center rounded-lg border border-white/20 bg-white/5 px-10 text-base font-semibold text-white backdrop-blur-sm transition hover:border-emerald-400/40 hover:bg-white/10"
          >
            {section.ctaSecondary}
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-white/35">{section.footnote}</p>
      </div>
    </section>
  )
}
