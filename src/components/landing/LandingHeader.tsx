import { Link } from 'react-router-dom'
import { InstallAppButton } from '../InstallAppButton'
import { PlooyLogo } from '../PlooyLogo'
import { SITE_NAV_ITEMS, type SiteNavId } from '../../constants/siteNav'

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

export function LandingHeader({ scrolled, hiddenNavIds = [] }: LandingHeaderProps) {
  const hidden = new Set(hiddenNavIds)
  const browseLinks = SITE_NAV_ITEMS.filter(
    (item) => GUEST_NAV_IDS.has(item.id) && !hidden.has(item.id),
  )

  return (
    <header
      className={`safe-top fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/5 bg-sineoda-bg/90 backdrop-blur-xl'
          : 'bg-gradient-to-b from-black/80 via-black/30 to-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <PlooyLogo tone="on-dark" className="h-7 sm:h-8" linked linkTo="/" />
        </Link>

        <nav className="hidden items-center gap-6 lg:gap-8 md:flex">
          {browseLinks.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`text-sm font-medium transition hover:text-white ${
                item.id === 'gencSinema' ? 'text-emerald-300/90 hover:text-emerald-200' : 'text-white/70'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/planlar" className="text-sm font-medium text-white/70 transition hover:text-white">
            Planlar
          </Link>
          <Link to="/giris" className="text-sm font-medium text-white/70 transition hover:text-white">
            Giriş Yap
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <InstallAppButton
            variant="ghost"
            className="hidden sm:inline-flex"
            label="Yükle"
          />
          <Link
            to="/giris"
            className="rounded-md px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 md:hidden"
          >
            Giriş
          </Link>
          <Link
            to="/kayit"
            className="rounded-md bg-sineoda-gold px-4 py-2 text-sm font-bold text-sineoda-bg transition hover:brightness-110 sm:px-6 sm:py-2.5"
          >
            Üye Ol
          </Link>
        </div>
      </div>
    </header>
  )
}
