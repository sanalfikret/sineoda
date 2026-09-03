import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../../i18n/LocaleContext'
import { SiteFooter } from '../SiteFooter'

export function CreatorAuthLayout({
  children,
  backTo,
}: {
  children: React.ReactNode
  backTo?: string
}) {
  const { t } = useTranslation('creator')
  const { t: tCommon } = useTranslation()
  const { localizePath } = useLocale()
  const navigate = useNavigate()
  const homePath = localizePath('/')
  const resolvedBack = backTo ?? homePath

  return (
    <div className="flex min-h-dvh flex-col bg-[#0d0f14]">
      <header className="safe-top mx-auto w-full max-w-md px-4 pt-10 sm:px-6 sm:pt-12">
        <button
          type="button"
          onClick={() => navigate(resolvedBack)}
          className="inline-flex min-h-11 items-center rounded-md px-1 py-2 text-sm text-plooy-muted transition hover:text-white"
        >
          ← {tCommon('auth.back')}
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">{children}</div>

      <div className="safe-bottom px-4 pb-8 text-center">
        <Link to={homePath} className="text-sm font-medium text-plooy-gold hover:underline">
          {t('auth.backToSite')}
        </Link>
      </div>
      <SiteFooter />
    </div>
  )
}
