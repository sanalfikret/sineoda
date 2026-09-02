import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PlooyLogo } from '../components/PlooyLogo'
import { useLocale } from '../i18n/LocaleContext'

export function PaytrCheckoutPage() {
  const { t } = useTranslation('payment')
  const { localizePath } = useLocale()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const returnTarget = params.get('return')
  const cancelPath =
    returnTarget === 'creator' ? localizePath('/creator/odeme') : localizePath('/planlar')

  useEffect(() => {
    if (!token) return
    const script = document.createElement('script')
    script.src = 'https://www.paytr.com/js/iframeResizer.min.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [token])

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg px-4 text-center text-white">
        <div>
          <p>{t('sessionNotFound')}</p>
          <Link to={cancelPath} className="mt-4 inline-block text-plooy-gold hover:underline">
            {t('backToPlansLower')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-plooy-bg">
      <header className="safe-top border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <PlooyLogo tone="on-dark" className="h-6" />
            <span className="text-sm text-plooy-muted">· PayTR</span>
          </div>
          <Link to={cancelPath} className="text-sm text-plooy-muted hover:text-white">
            {t('cancel')}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <iframe
          src={`https://www.paytr.com/odeme/guvenli/${token}`}
          id="paytriframe"
          title={t('iframeTitle')}
          className="h-[720px] w-full rounded-2xl border border-white/10 bg-white"
        />
      </main>
    </div>
  )
}
