import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LANDING_NAV_ITEMS } from '../../constants/navigation'

interface LandingHeaderProps {
  scrolled: boolean
}

export function LandingHeader({ scrolled }: LandingHeaderProps) {
  const { isCreator } = useAuth()

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
          <img src="/icon.svg" alt="" className="h-8 w-8 rounded-md sm:h-9 sm:w-9" />
          <span className="text-xl font-bold tracking-tight sm:text-2xl">
            Sine<span className="text-sineoda-gold">oda</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LANDING_NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          {isCreator ? (
            <Link to="/creator" className="text-sm font-medium text-white/70 transition hover:text-white">
              Yapımcı Paneli
            </Link>
          ) : (
            <Link to="/giris" className="text-sm font-medium text-white/70 transition hover:text-white">
              Giriş Yap
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isCreator ? (
            <Link
              to="/creator"
              className="rounded-md bg-sineoda-gold px-4 py-2 text-sm font-bold text-sineoda-bg transition hover:brightness-110 sm:px-6 sm:py-2.5"
            >
              Panele Dön
            </Link>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  )
}
