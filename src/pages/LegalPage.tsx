import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fetchLegalDocuments } from '../api/client'
import { LEGAL_DOCUMENTS, type LegalDocument, type LegalSlug } from '../constants/legal'
import { PageFooter } from '../components/PageFooter'
import { PlooyLogo } from '../components/PlooyLogo'

const SLUGS = new Set(Object.keys(LEGAL_DOCUMENTS))

function returnLabel(path: string) {
  if (path.startsWith('/kayit')) return 'Kayda dön'
  if (path.startsWith('/giris')) return 'Girişe dön'
  if (path.startsWith('/creator/kayit')) return 'Başvuruya dön'
  if (path.startsWith('/hesap')) return 'Hesaba dön'
  return 'Geri dön'
}

export function LegalPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('geri')
  const key = slug && SLUGS.has(slug) ? (slug as LegalSlug) : null
  const [doc, setDoc] = useState<LegalDocument | null>(key ? LEGAL_DOCUMENTS[key] : null)
  const [loading, setLoading] = useState(Boolean(key))

  useEffect(() => {
    if (!key) return
    setLoading(true)
    void fetchLegalDocuments()
      .then((data) => setDoc(data.documents[key]))
      .catch(() => setDoc(LEGAL_DOCUMENTS[key]))
      .finally(() => setLoading(false))
  }, [key])

  if (!key || !doc) {
    return (
      <div className="min-h-dvh bg-plooy-bg px-4 py-24 text-center text-white sm:px-6">
        <h1 className="text-2xl font-bold">Sayfa bulunamadı</h1>
        {returnTo ? (
          <Link to={returnTo} className="mt-4 inline-block text-plooy-gold hover:underline">
            ← {returnLabel(returnTo)}
          </Link>
        ) : (
          <Link to="/" className="mt-4 inline-block text-plooy-gold hover:underline">
            Ana sayfaya dön
          </Link>
        )}
      </div>
    )
  }

  const backLabel = returnTo ? returnLabel(returnTo) : 'Ana sayfa'

  return (
    <div className="min-h-dvh bg-plooy-bg">
      <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          {returnTo ? (
            <Link
              to={returnTo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-plooy-gold hover:bg-white/5"
            >
              ← {backLabel}
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              ← Ana sayfa
            </Link>
          )}
          <PlooyLogo tone="on-dark" linked linkTo="/" className="h-7" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plooy-gold">Yasal</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-plooy-muted">Son güncelleme: {doc.updatedAt}</p>

        {loading ? (
          <p className="mt-10 text-sm text-plooy-muted">Yükleniyor...</p>
        ) : (
          <div className="mt-10 space-y-8">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{section.body}</p>
              </section>
            ))}
          </div>
        )}

        {returnTo && (
          <div className="mt-10 border-t border-white/10 pt-8">
            <Link
              to={returnTo}
              className="inline-flex w-full items-center justify-center rounded-lg bg-plooy-gold py-3 text-sm font-semibold text-plooy-bg hover:brightness-110 sm:w-auto sm:px-8"
            >
              ← {backLabel}
            </Link>
          </div>
        )}
      </main>

      <PageFooter />
    </div>
  )
}
