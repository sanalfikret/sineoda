import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSearchUI } from '../context/SearchContext'

const navItems = [
  { label: 'Ana Sayfa', to: '/', match: (path: string) => path === '/' },
  { label: 'Diziler', to: '/diziler', match: (path: string) => path === '/diziler' },
  { label: 'Filmler', to: '/filmler', match: (path: string) => path === '/filmler' },
  { label: 'Belgeseller', to: '/belgeseller', match: (path: string) => path === '/belgeseller' },
  { label: 'Dikey Diziler', to: '/dikey-diziler', match: (path: string) => path === '/dikey-diziler' },
  { label: 'Listem', to: '/listem', match: (path: string) => path === '/listem' },
  { label: 'Dergi', to: '/dergi', match: (path: string) => path === '/dergi' || path.startsWith('/dergi/') },
  { label: 'Yapımcı', to: '/creator/giris', match: (path: string) => path.startsWith('/creator') },
]

export function Header() {
  const { user, activeProfile, logout } = useAuth()
  const { openSearch } = useSearchUI()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (match: (path: string) => boolean) => match(location.pathname)

  return (
    <header
      className={`safe-top fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled || menuOpen
          ? 'bg-sineoda-bg/95 backdrop-blur-md'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8 tv:py-5">
        <div className="flex items-center gap-4 lg:gap-8">
          <Link to="/" className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sineoda-gold">
            <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg sm:h-9 sm:w-9 tv:h-11 tv:w-11" />
            <span className="text-xl font-bold tracking-tight text-white sm:text-2xl tv:text-3xl">
              Sine<span className="text-sineoda-gold">oda</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold tv:px-4 tv:py-3 tv:text-base ${
                  isActive(item.match)
                    ? 'bg-white/10 text-white'
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Ara"
            onClick={openSearch}
            className="rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold tv:p-3"
          >
            <SearchIcon />
          </button>

          {user && activeProfile ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold tv:px-4 tv:py-2.5 tv:text-base"
              >
                <span className="text-lg leading-none tv:text-xl">{activeProfile.avatar}</span>
                <span className="hidden max-w-[100px] truncate sm:inline">{activeProfile.name}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-sineoda-elevated py-1 shadow-xl">
                  <Link
                    to="/profiller"
                    className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Profil Değiştir
                  </Link>
                  <Link
                    to="/planlar"
                    className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Abonelik
                  </Link>
                  <Link
                    to="/listem"
                    className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Listem
                  </Link>
                  <button
                    type="button"
                    className="block w-full px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                    onClick={() => {
                      logout()
                      setUserMenuOpen(false)
                    }}
                  >
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/giris"
              className="hidden rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold sm:inline-flex tv:px-5 tv:py-2.5 tv:text-base"
            >
              Giriş Yap
            </Link>
          )}

          <button
            type="button"
            aria-label="Menü"
            className="rounded-full p-2.5 text-white md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-white/10 px-4 py-4 md:hidden">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`block w-full rounded-lg px-3 py-3 text-sm font-medium ${
                    isActive(item.match) ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/5'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {!user && (
              <li>
                <Link
                  to="/giris"
                  className="mt-2 block w-full rounded-lg bg-sineoda-gold px-3 py-3 text-center text-sm font-semibold text-sineoda-bg"
                  onClick={() => setMenuOpen(false)}
                >
                  Giriş Yap
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
