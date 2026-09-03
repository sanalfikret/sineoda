import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchLegalDocuments } from '../api/client'
import { LEGAL_DOCUMENTS, type LegalDocument, type LegalSlug } from '../constants/legal'
import { PageFooter } from '../components/PageFooter'
import { PlooyLogo } from '../components/PlooyLogo'
import { useLocale } from '../i18n/LocaleContext'
import { toTrPathname } from '../i18n/paths'

const SLUGS = new Set(Object.keys(LEGAL_DOCUMENTS))

type ReturnLabelKey =
  | 'returnToSignup'
  | 'returnToLogin'
  | 'returnToCreatorSignup'
  | 'returnToAccount'
  | 'returnBack'

function returnLabelKey(path: string): ReturnLabelKey {
  const trPath = toTrPathname(path)
  if (trPath.startsWith('/kayit')) return 'returnToSignup'
  if (trPath.startsWith('/giris')) return 'returnToLogin'
  if (trPath.startsWith('/creator/kayit')) return 'returnToCreatorSignup'
  if (trPath.startsWith('/hesap')) return 'returnToAccount'
  return 'returnBack'
}

export function LegalPage() {
  const { t } = useTranslation('legalShell')
  const { localizePath } = useLocale()
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
        <h1 className="text-2xl font-bold">{t('notFound')}</h1>
        {returnTo ? (
          <Link to={returnTo} className="mt-4 inline-block text-plooy-gold hover:underline">
            ← {t(returnLabelKey(returnTo))}
          </Link>
        ) : (
          <Link to={localizePath('/')} className="mt-4 inline-block text-plooy-gold hover:underline">
            {t('backHome')}
          </Link>
        )}
      </div>
    )
  }

  const backLabel = returnTo ? t(returnLabelKey(returnTo)) : t('home')

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
              to={localizePath('/')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              ← {t('home')}
            </Link>
          )}
          <PlooyLogo tone="on-dark" linked linkTo={localizePath('/')} className="h-7" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plooy-gold">{t('legalEyebrow')}</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-plooy-muted">{t('updatedAt')} {doc.updatedAt}</p>

        {loading ? (
          <p className="mt-10 text-sm text-plooy-muted">{t('loading')}</p>
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
