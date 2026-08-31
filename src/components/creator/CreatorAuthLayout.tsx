import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../../i18n/LocaleContext'
import { SiteFooter } from '../SiteFooter'

export function CreatorAuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('creator')
  const { localizePath } = useLocale()

  return (
    <div className="flex min-h-dvh flex-col bg-[#0d0f14]">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        {children}
      </div>
      <div className="px-4 pb-6 text-center">
        <Link to={localizePath('/')} className="text-sm text-plooy-gold hover:underline">
          {t('auth.backToSite')}
        </Link>
      </div>
      <SiteFooter />
    </div>
  )
}
