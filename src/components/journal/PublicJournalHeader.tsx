import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../i18n/LocaleContext'
import { PlooyLogo } from '../PlooyLogo'

export function PublicJournalHeader() {
  const { t } = useTranslation('landing')
  const { t: tc } = useTranslation()
  const { user } = useAuth()
  const { localizePath } = useLocale()

  return (
    <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
        <PlooyLogo tone="on-dark" linked linkTo={localizePath('/')} className="h-7" />
        {user ? (
          <Link
            to={localizePath('/profiller')}
            className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
          >
            {t('journal.backToProfiles')}
          </Link>
        ) : (
          <Link
            to={localizePath('/kayit')}
            className="rounded-md bg-plooy-accent px-4 py-2 text-sm font-semibold text-plooy-bg"
          >
            {tc('nav.signup')}
          </Link>
        )}
      </div>
    </header>
  )
}
