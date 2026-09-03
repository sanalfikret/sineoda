import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { GuestSiteShell } from '../components/GuestSiteShell'
import { PageFooter } from '../components/PageFooter'
import { useLocale } from '../i18n/LocaleContext'

export function PaymentSuccessPage() {
  const { t } = useTranslation('payment')
  const { localizePath } = useLocale()
  const { refreshUser, user } = useAuth()
  const [searchParams] = useSearchParams()
  const isCreatorReturn = searchParams.get('return') === 'creator' || user?.role === 'creator'

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  return (
    <GuestSiteShell footer={<PageFooter />} offsetHeader>
      <div className="min-h-dvh bg-plooy-bg">
      <div className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <p className="text-4xl">✓</p>
        <h1 className="mt-4 text-2xl font-bold text-white">{t('successTitle')}</h1>
        <p className="mt-2 text-sm text-emerald-100">
          {isCreatorReturn ? t('successCreatorBody') : t('successViewerBody')}
        </p>
        <Link
          to={localizePath(isCreatorReturn ? '/creator' : '/profiller')}
          className="mt-6 inline-block rounded-lg bg-plooy-gold px-6 py-3 text-sm font-semibold text-plooy-bg"
        >
          {isCreatorReturn ? t('goToCreatorPanel') : t('selectProfile')}
        </Link>
      </div>
      </div>
      </div>
    </GuestSiteShell>
  )
}
