import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { InstallAppButton } from '../InstallAppButton'
import { PlooyLogo } from '../PlooyLogo'
import { SITE_NAV_ITEMS, type SiteNavId } from '../../constants/siteNav'
import { useLocale } from '../../i18n/LocaleContext'
import { LanguageSwitcher } from '../LanguageSwitcher'

interface LandingHeaderProps {
  scrolled: boolean
  hiddenNavIds?: SiteNavId[]
}

const GUEST_NAV_IDS = new Set<SiteNavId>([
  'diziler',
  'filmler',
  'belgeseller',
  'dikey',
  'gencSinema',
  'dergi',
])

const NAV_I18N: Partial<Record<SiteNavId, string>> = {
  diziler: 'nav.diziler',
  filmler: 'nav.filmler',
  belgeseller: 'nav.belgeseller',
  dikey: 'nav.dikey',
  gencSinema: 'nav.gencSinema',
  dergi: 'nav.dergi',
}

export function LandingHeader({ scrolled, hiddenNavIds = [] }: LandingHeaderProps) {
  const { t } = useTranslation()
  const { localizePath } = useLocale()
  const hidden = new Set(hiddenNavIds)
  const browseLinks = SITE_NAV_ITEMS.filter(
    (item) => GUEST_NAV_IDS.has(item.id) && !hidden.has(item.id),
  )

  return (
    <header
      className={`safe-top fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/5 bg-plooy-bg/90 backdrop-blur-xl'
          : 'bg-gradient-to-b from-black/80 via-black/30 to-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-8">
        <PlooyLogo tone="on-dark" className="h-7 sm:h-8" linked linkTo={localizePath('/')} />

        <nav className="hidden items-center gap-6 lg:gap-8 md:flex">
          {browseLinks.map((item) => (
            <Link
              key={item.id}
              to={localizePath(item.path)}
              className={`text-sm font-medium transition hover:text-white ${
                item.id === 'gencSinema' ? 'text-emerald-300/90 hover:text-emerald-200' : 'text-white/70'
              }`}
            >
              {t(NAV_I18N[item.id] ?? item.label)}
            </Link>
          ))}
          <Link
            to={localizePath('/planlar')}
            className="text-sm font-medium text-white/70 transition hover:text-white"
          >
            {t('nav.plans')}
          </Link>
          <Link
            to={localizePath('/giris')}
            className="text-sm font-medium text-white/70 transition hover:text-white"
          >
            {t('nav.login')}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher className="inline-flex" />
          <InstallAppButton
            variant="ghost"
            className="hidden sm:inline-flex"
            label={t('nav.install')}
          />
          <Link
            to={localizePath('/giris')}
            className="rounded-md px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 md:hidden"
          >
            {t('nav.loginShort')}
          </Link>
          <Link
            to={localizePath('/kayit')}
            className="rounded-md bg-plooy-gold px-4 py-2 text-sm font-bold text-plooy-bg transition hover:brightness-110 sm:px-6 sm:py-2.5"
          >
            {t('nav.signup')}
          </Link>
        </div>
      </div>
    </header>
  )
}
