import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BRAND_NAME } from '../constants/brand'
import { InstallAppButton } from './InstallAppButton'
import { LEGAL_LINKS, legalPageHref, type LegalSlug } from '../constants/legal'
import { useLocale } from '../i18n/LocaleContext'
import { toTrPathname } from '../i18n/paths'

const FOOTER_LEGAL_KEYS: Record<LegalSlug, string> = {
  'kullanim-kosullari': 'footer.terms',
  'gizlilik-politikasi': 'footer.privacy',
  'kvkk-aydinlatma': 'footer.kvkk',
  'acik-riza-metni': 'footer.consent',
  'cerez-politikasi': 'footer.cookies',
}

export function SiteFooter() {
  const { t } = useTranslation()
  const location = useLocation()
  const { localizePath } = useLocale()
  const trPath = toTrPathname(location.pathname)
  const returnTo = trPath.startsWith('/yasal')
    ? undefined
    : `${location.pathname}${location.search}`

  return (
    <footer className="border-t border-white/5 bg-plooy-bg px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm text-plooy-muted">© {new Date().getFullYear()} {BRAND_NAME}</p>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          <Link to={localizePath('/dergi')} className="text-plooy-muted transition hover:text-white">
            {t('footer.journal')}
          </Link>
          <Link to={localizePath('/iletisim')} className="text-plooy-muted transition hover:text-white">
            {t('footer.contact')}
          </Link>
          <Link to={localizePath('/creator/giris')} className="text-plooy-muted transition hover:text-white">
            {t('footer.creatorLogin')}
          </Link>
          <Link to={localizePath('/creator/kayit')} className="text-plooy-muted transition hover:text-white">
            {t('footer.creatorApply')}
          </Link>
          <InstallAppButton variant="link" label={t('footer.installApp')} />
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.slug}
              to={localizePath(legalPageHref(link.slug, returnTo))}
              className="text-plooy-muted transition hover:text-white"
            >
              {t(FOOTER_LEGAL_KEYS[link.slug])}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
