import { Link, useParams } from 'react-router-dom'
import { LEGAL_DOCUMENTS, type LegalSlug } from '../constants/legal'
import { PageFooter } from '../components/PageFooter'
import { PlooyLogo } from '../components/PlooyLogo'

const SLUGS = new Set(Object.keys(LEGAL_DOCUMENTS))

export function LegalPage() {
  const { slug } = useParams<{ slug: string }>()
  const key = slug && SLUGS.has(slug) ? (slug as LegalSlug) : null
  const doc = key ? LEGAL_DOCUMENTS[key] : null

  if (!doc) {
    return (
      <div className="min-h-dvh bg-sineoda-bg px-4 py-24 text-center text-white sm:px-6">
        <h1 className="text-2xl font-bold">Sayfa bulunamadı</h1>
        <Link to="/" className="mt-4 inline-block text-sineoda-gold hover:underline">
          Ana sayfaya dön
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-sineoda-bg">
      <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <PlooyLogo tone="on-dark" linked linkTo="/" className="h-7" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sineoda-gold">Yasal</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-sineoda-muted">Son güncelleme: {doc.updatedAt}</p>

        <div className="mt-10 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80">{section.body}</p>
            </section>
          ))}
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
