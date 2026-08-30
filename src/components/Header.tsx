import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchUnreadMessageCount, prefetchCekimNotlariSections } from '../api/client'
import { SITE_NAV_ITEMS, EXPLORE_NAV_IDS, PRIMARY_NAV_IDS, type SiteNavId } from '../constants/siteNav'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../context/ContentContext'
import { useSearchUI } from '../context/SearchContext'
import { ProfileAvatar } from './ProfileAvatar'
import { PlooyLogo } from './PlooyLogo'
import { InstallAppMenuItem } from './InstallAppButton'
import { PROFILE_AVATARS } from '../types/auth'

const creatorNavItems = [
  { label: 'Yapımcı Paneli', to: '/creator', match: (path: string) => path.startsWith('/creator') },
  { label: 'Ana Site', to: '/', match: (path: string) => path === '/' },
]

export function Header() {
  const { user, activeProfile, logout, isCreator, clearActiveProfile } = useAuth()
  const { hiddenNavIds } = useContent()
  const { openSearch } = useSearchUI()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  const showMemberInbox = Boolean(user && activeProfile && !isCreator && user.role === 'user')

  useEffect(() => {
    if (!showMemberInbox) {
      setUnreadMessages(0)
      return
    }
    void fetchUnreadMessageCount()
      .then((data) => setUnreadMessages(data.count))
      .catch(() => setUnreadMessages(0))
  }, [showMemberInbox, location.pathname])

  useEffect(() => {
    setExploreOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = useMemo(() => {
    if (isCreator) {
      return creatorNavItems.map((item) => ({
        ...item,
        id: item.to as SiteNavId,
        shortLabel: undefined as string | undefined,
        isStudentCinema: false,
      }))
    }
    return SITE_NAV_ITEMS.filter((item) => !hiddenNavIds.includes(item.id)).map((item) => ({
      id: item.id,
      label: item.label,
      shortLabel: item.shortLabel,
      to: item.path,
      match: item.match,
      isStudentCinema: item.id === 'gencSinema',
    }))
  }, [isCreator, hiddenNavIds])

  const primaryNavItems = useMemo(
    () => (isCreator ? navItems : navItems.filter((item) => PRIMARY_NAV_IDS.includes(item.id as SiteNavId))),
    [isCreator, navItems],
  )

  const exploreNavItems = useMemo(
    () => (isCreator ? [] : navItems.filter((item) => EXPLORE_NAV_IDS.includes(item.id as SiteNavId))),
    [isCreator, navItems],
  )

  const showListemLink = !isCreator && !hiddenNavIds.includes('listem')
  const isActive = (match: (path: string) => boolean) => match(location.pathname)
  const exploreActive = exploreNavItems.some((item) => isActive(item.match))

  const navLinkClass = (item: (typeof navItems)[number], active: boolean) =>
    `whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold lg:px-3 lg:text-sm xl:text-[15px] tv:px-4 tv:py-3 tv:text-base ${
      item.isStudentCinema
        ? active
          ? 'bg-emerald-500/15 text-emerald-300'
          : 'text-emerald-200/80 hover:bg-emerald-500/10 hover:text-emerald-200'
        : active
          ? 'bg-white/10 text-white'
          : 'text-white/75 hover:bg-white/5 hover:text-white'
    }`

  return (
    <header
      className={`safe-top fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled || menuOpen
          ? 'bg-sineoda-bg/95 backdrop-blur-md'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8 tv:py-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4 lg:gap-8">
          <Link
            to={isCreator ? '/creator' : '/'}
            className="flex shrink-0 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sineoda-gold"
          >
            <PlooyLogo variant="mark" tone="on-dark" className="h-8 sm:hidden" />
            <PlooyLogo variant="wordmark" tone="on-dark" className="hidden h-7 sm:block sm:h-8 tv:h-9" />
          </Link>

          <nav className="hidden min-w-0 flex-nowrap items-center gap-0.5 md:flex lg:gap-1">
            {primaryNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={navLinkClass(item, isActive(item.match))}
              >
                <span className="xl:hidden">{item.shortLabel ?? item.label}</span>
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            ))}

            {exploreNavItems.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExploreOpen((open) => !open)}
                  onMouseEnter={() => prefetchCekimNotlariSections()}
                  onFocus={() => prefetchCekimNotlariSections()}
                  onBlur={() => window.setTimeout(() => setExploreOpen(false), 150)}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold lg:px-3 lg:text-sm xl:text-[15px] ${
                    exploreActive || exploreOpen
                      ? 'bg-white/10 text-white'
                      : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Keşfet <span className="text-[10px] opacity-70">▾</span>
                </button>
                {exploreOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-white/10 bg-sineoda-elevated py-1 shadow-xl">
                    {exploreNavItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setExploreOpen(false)}
                        onMouseEnter={item.id === 'cekimNotlari' ? () => prefetchCekimNotlariSections() : undefined}
                        onFocus={item.id === 'cekimNotlari' ? () => prefetchCekimNotlariSections() : undefined}
                        className={`block whitespace-nowrap px-4 py-2.5 text-sm transition hover:bg-white/5 ${
                          item.isStudentCinema
                            ? isActive(item.match)
                              ? 'text-emerald-300'
                              : 'text-emerald-200/90'
                            : isActive(item.match)
                              ? 'text-white'
                              : 'text-white/85'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
          {showMemberInbox && (
            <>
              <Link
                to="/mesajlar"
                aria-label={unreadMessages > 0 ? `${unreadMessages} okunmamış mesaj` : 'Mesajlarım'}
                className="relative rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold sm:hidden tv:p-3"
              >
                <MessagesIcon />
                {unreadMessages > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sineoda-gold px-1 text-[10px] font-bold text-sineoda-bg">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                to="/mesajlar"
                className={`hidden items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold sm:inline-flex lg:px-3 lg:text-sm ${
                  isActive((path) => path === '/mesajlar')
                    ? 'bg-white/10 text-white'
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                Mesajlarım
                {unreadMessages > 0 && (
                  <span className="rounded-full bg-sineoda-gold px-1.5 py-0.5 text-[10px] font-bold leading-none text-sineoda-bg">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
            </>
          )}

          {!isCreator && !user && (
            <Link
              to="/iletisim"
              aria-label="İletişim"
              className="rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold tv:p-3"
            >
              <MessagesIcon />
            </Link>
          )}

          {!isCreator && (
            <button
              type="button"
              aria-label="Ara"
              onClick={openSearch}
              className="rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold tv:p-3"
            >
              <SearchIcon />
            </button>
          )}

          {showListemLink && user && activeProfile && (
            <Link
              to="/listem"
              className={`hidden whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold sm:inline-flex lg:px-3 lg:text-sm ${
                isActive((path) => path === '/listem')
                  ? 'bg-white/10 text-white'
                  : 'text-white/75 hover:bg-white/5 hover:text-white'
              }`}
            >
              Listem
            </Link>
          )}

          {user && (activeProfile || isCreator) ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sineoda-gold tv:px-4 tv:py-2.5 tv:text-base"
              >
                {isCreator ? (
                  <span className="hidden max-w-[140px] truncate sm:inline">
                    {user.creator?.studioName ?? 'Yapımcı'}
                  </span>
                ) : (
                  <>
                    <ProfileAvatar
                      avatar={activeProfile?.avatar ?? PROFILE_AVATARS[0]}
                      name={activeProfile?.name ?? ''}
                      className="h-7 w-7 rounded-full tv:h-8 tv:w-8"
                      imageClassName="h-full w-full rounded-full object-cover"
                      emojiClassName="text-base tv:text-lg"
                    />
                    <span className="hidden max-w-[100px] truncate sm:inline">{activeProfile?.name}</span>
                  </>
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-sineoda-elevated py-1 shadow-xl">
                  {isCreator ? (
                    <>
                      <Link
                        to="/creator"
                        className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Yapımcı Paneli
                      </Link>
                      <button
                        type="button"
                        className="block w-full px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => {
                          logout()
                          setUserMenuOpen(false)
                          navigate('/')
                        }}
                      >
                        Çıkış Yap
                      </button>
                    </>
                  ) : (
                    <>
                      {showMemberInbox && (
                        <Link
                          to="/mesajlar"
                          className="flex items-center justify-between px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span>Mesajlarım</span>
                          {unreadMessages > 0 && (
                            <span className="rounded-full bg-sineoda-gold px-2 py-0.5 text-xs font-semibold text-sineoda-bg">
                              {unreadMessages}
                            </span>
                          )}
                        </Link>
                      )}
                      <Link
                        to="/hesap"
                        className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Hesabım
                      </Link>
                      <button
                        type="button"
                        className="block w-full px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => {
                          clearActiveProfile()
                          setUserMenuOpen(false)
                          navigate('/profiller')
                        }}
                      >
                        Profil Değiştir
                      </button>
                      <Link
                        to="/planlar"
                        className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Abonelik
                      </Link>
                      <InstallAppMenuItem onNavigate={() => setUserMenuOpen(false)} />
                      <button
                        type="button"
                        className="block w-full px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => {
                          logout()
                          setUserMenuOpen(false)
                          navigate('/')
                        }}
                      >
                        Çıkış Yap
                      </button>
                    </>
                  )}
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
        <nav className="safe-bottom max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-white/10 px-3 py-3 md:hidden">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`block w-full rounded-lg px-3 py-3.5 text-base font-medium ${
                    isActive(item.match) ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/5'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {showListemLink && user && activeProfile && (
              <li>
                <Link
                  to="/listem"
                  className="block w-full rounded-lg px-3 py-3.5 text-base font-medium text-white/90 hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  Listem
                </Link>
              </li>
            )}
            {showMemberInbox && (
              <li>
                <Link
                  to="/mesajlar"
                  className="flex items-center justify-between rounded-lg px-3 py-3.5 text-base font-medium text-white/90 hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Mesajlarım</span>
                  {unreadMessages > 0 && (
                    <span className="rounded-full bg-sineoda-gold px-2 py-0.5 text-xs font-semibold text-sineoda-bg">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              </li>
            )}
            {user && !isCreator && (
              <li>
                <Link
                  to="/planlar"
                  className="block w-full rounded-lg px-3 py-3.5 text-base font-medium text-white/90 hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  Abonelik
                </Link>
              </li>
            )}
            {!user && (
              <>
                <li>
                  <Link
                    to="/iletisim"
                    className="block w-full rounded-lg px-3 py-3.5 text-base font-medium text-white/90 hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    Mesaj Gönder
                  </Link>
                </li>
                <li>
                  <Link
                    to="/giris"
                    className="mt-2 block w-full rounded-lg bg-sineoda-gold px-3 py-3 text-center text-sm font-semibold text-sineoda-bg"
                    onClick={() => setMenuOpen(false)}
                  >
                    Giriş Yap
                  </Link>
                </li>
              </>
            )}
            <li>
              <InstallAppMenuItem onNavigate={() => setMenuOpen(false)} />
            </li>
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

function MessagesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5H20V16.5H7.5L4 19.5V5.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
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
