import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GuestSiteShell } from '../components/GuestSiteShell'
import { PageFooter } from '../components/PageFooter'
import { useLocale } from '../i18n/LocaleContext'

export function PaymentFailPage() {
  const { t } = useTranslation('payment')
  const { localizePath } = useLocale()

  return (
    <GuestSiteShell footer={<PageFooter />} offsetHeader>
      <div className="min-h-dvh bg-plooy-bg">
      <div className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-4xl">✕</p>
        <h1 className="mt-4 text-2xl font-bold text-white">{t('failTitle')}</h1>
        <p className="mt-2 text-sm text-red-100">{t('failBody')}</p>
        <Link
          to={localizePath('/planlar')}
          className="mt-6 inline-block rounded-lg bg-plooy-gold px-6 py-3 text-sm font-semibold text-plooy-bg"
        >
          {t('backToPlans')}
        </Link>
      </div>
      </div>
      </div>
    </GuestSiteShell>
  )
}
