import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchUnreadMessageCount, prefetchCekimNotlariSections } from '../api/client'
import { SITE_NAV_ITEMS, EXPLORE_NAV_IDS, PRIMARY_NAV_IDS, type SiteNavId } from '../constants/siteNav'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../context/ContentContext'
import { useSearchUI } from '../context/SearchContext'
import { useLocale } from '../i18n/LocaleContext'
import { toTrPathname } from '../i18n/paths'
import { ProfileAvatar } from './ProfileAvatar'
import { PlooyLogo } from './PlooyLogo'
import { InstallAppButton, InstallAppMenuItem } from './InstallAppButton'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PROFILE_AVATARS } from '../types/auth'

const NAV_I18N: Record<SiteNavId, { label: string; shortLabel?: string }> = {
  home: { label: 'nav.home' },
  diziler: { label: 'nav.diziler' },
  filmler: { label: 'nav.filmler' },
  belgeseller: { label: 'nav.belgeseller', shortLabel: 'nav.belgeselShort' },
  standup: { label: 'nav.standup' },
  klasikler: { label: 'nav.klasikler' },
  dikey: { label: 'nav.dikey', shortLabel: 'nav.dikeyShort' },
  gencSinema: { label: 'nav.gencSinema', shortLabel: 'nav.gencSinemaShort' },
  cekimNotlari: { label: 'nav.cekimNotlari', shortLabel: 'nav.cekimShort' },
  listem: { label: 'nav.listem' },
  dergi: { label: 'nav.dergi' },
}

export function Header() {
  const { t } = useTranslation()
  const { user, activeProfile, logout, isCreator, isAdmin, clearActiveProfile } = useAuth()
  const { hiddenNavIds } = useContent()
  const { openSearch } = useSearchUI()
  const { localizePath } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const trPath = toTrPathname(location.pathname)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  const canOpenMessagesPage = Boolean(user && activeProfile && !isCreator)
  const showMemberInbox = Boolean(canOpenMessagesPage && !isAdmin)

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

  const creatorNavItems = useMemo(
    () => [
      {
        label: t('nav.creatorPanel'),
        to: localizePath('/creator'),
        match: (path: string) => toTrPathname(path).startsWith('/creator') && toTrPathname(path) !== '/creator/giris',
      },
      {
        label: t('nav.mainSite'),
        to: localizePath('/'),
        match: (path: string) => toTrPathname(path) === '/',
      },
    ],
    [localizePath, t],
  )

  const navItems = useMemo(() => {
    if (isCreator) {
      return creatorNavItems.map((item) => ({
        ...item,
        id: item.to as SiteNavId,
        shortLabel: undefined as string | undefined,
        isStudentCinema: false,
      }))
    }
    return SITE_NAV_ITEMS.filter((item) => !hiddenNavIds.includes(item.id)).map((item) => {
      const keys = NAV_I18N[item.id]
      return {
        id: item.id,
        label: t(keys.label),
        shortLabel: keys.shortLabel ? t(keys.shortLabel) : undefined,
        to: localizePath(item.path),
        match: item.match,
        isStudentCinema: item.id === 'gencSinema',
      }
    })
  }, [isCreator, hiddenNavIds, creatorNavItems, localizePath, t])

  const primaryNavItems = useMemo(() => {
    if (isCreator) return navItems
    let items = navItems.filter((item) => PRIMARY_NAV_IDS.includes(item.id as SiteNavId))
    if (!user && trPath === '/') {
      items = items.filter((item) => item.id !== 'home')
    }
    return items
  }, [isCreator, navItems, user, trPath])

  const exploreNavItems = useMemo(
    () => (isCreator ? [] : navItems.filter((item) => EXPLORE_NAV_IDS.includes(item.id as SiteNavId))),
    [isCreator, navItems],
  )

  const showListemLink = !isCreator && !hiddenNavIds.includes('listem')
  const isActive = (match: (path: string) => boolean) => match(trPath)
  const exploreActive = exploreNavItems.some((item) => isActive(item.match))

  const navLinkClass = (item: (typeof navItems)[number], active: boolean) =>
    `whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold lg:px-3 lg:text-sm xl:text-[15px] tv:px-4 tv:py-3 tv:text-base ${
      active
        ? item.isStudentCinema
          ? 'bg-emerald-500/15 text-emerald-300'
          : 'bg-white/10 text-white'
        : 'text-white/75 hover:bg-white/5 hover:text-white'
    }`

  const homePath = localizePath(isCreator ? '/creator' : '/')

  return (
    <header
      className={`safe-top fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled || menuOpen
          ? 'bg-plooy-bg/95 backdrop-blur-md'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8 tv:py-5">
        <div className="flex min-w-0 shrink items-center gap-2 sm:gap-4 lg:gap-8">
          <PlooyLogo tone="on-dark" className="h-7 sm:h-8 tv:h-9" linked linkTo={homePath} />

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
                  className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold lg:px-3 lg:text-sm xl:text-[15px] ${
                    exploreActive || exploreOpen
                      ? 'bg-white/10 text-white'
                      : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {t('nav.explore')} <span className="text-[10px] opacity-70">▾</span>
                </button>
                {exploreOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-white/10 bg-plooy-elevated py-1 shadow-xl">
                    {exploreNavItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setExploreOpen(false)}
                        onMouseEnter={item.id === 'cekimNotlari' ? () => prefetchCekimNotlariSections() : undefined}
                        onFocus={item.id === 'cekimNotlari' ? () => prefetchCekimNotlariSections() : undefined}
                        className={`block whitespace-nowrap px-4 py-2.5 text-sm transition hover:bg-white/5 ${
                          isActive(item.match)
                            ? item.isStudentCinema
                              ? 'text-emerald-300'
                              : 'text-white'
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

        <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:gap-2 md:gap-3">
          {showMemberInbox && (
            <>
              <Link
                to={localizePath('/mesajlar')}
                aria-label={
                  unreadMessages > 0
                    ? t('nav.unreadMessages', { count: unreadMessages })
                    : t('nav.messagesAria')
                }
                className="relative rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold sm:hidden tv:p-3"
              >
                <MessagesIcon />
                {unreadMessages > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-plooy-gold px-1 text-[10px] font-bold text-plooy-bg">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                to={localizePath('/mesajlar')}
                className={`hidden items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold sm:inline-flex lg:px-3 lg:text-sm ${
                  trPath === '/mesajlar'
                    ? 'bg-white/10 text-white'
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.messages')}
                {unreadMessages > 0 && (
                  <span className="rounded-full bg-plooy-gold px-1.5 py-0.5 text-[10px] font-bold leading-none text-plooy-bg">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
            </>
          )}

          {!isCreator && !user && (
            <Link
              to={localizePath('/planlar')}
              className="hidden whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/75 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold lg:inline-flex lg:px-3 lg:text-sm"
            >
              {t('nav.plans')}
            </Link>
          )}

          {!isCreator && (
            <button
              type="button"
              aria-label={t('nav.search')}
              onClick={openSearch}
              className="rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold tv:p-3"
            >
              <SearchIcon />
            </button>
          )}

          {showListemLink && user && activeProfile && (
            <Link
              to={localizePath('/listem')}
              className={`hidden whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold sm:inline-flex lg:px-3 lg:text-sm ${
                trPath === '/listem'
                  ? 'bg-white/10 text-white'
                  : 'text-white/75 hover:bg-white/5 hover:text-white'
              }`}
            >
              {t('nav.listem')}
            </Link>
          )}

          {user && (activeProfile || isCreator) ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold tv:px-4 tv:py-2.5 tv:text-base"
              >
                {isCreator ? (
                  <span className="hidden max-w-[140px] truncate sm:inline">
                    {user.creator?.studioName ?? t('nav.creator')}
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
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-plooy-elevated py-1 shadow-xl">
                  {isCreator ? (
                    <>
                      <Link
                        to={localizePath('/creator')}
                        className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t('nav.creatorPanel')}
                      </Link>
                      <button
                        type="button"
                        className="block w-full px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => {
                          logout()
                          setUserMenuOpen(false)
                          navigate(localizePath('/'))
                        }}
                      >
                        {t('nav.logout')}
                      </button>
                    </>
                  ) : (
                    <>
                      {canOpenMessagesPage && (
                        <Link
                          to={localizePath('/mesajlar')}
                          className="flex items-center justify-between px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span>{t('nav.messages')}</span>
                          {showMemberInbox && unreadMessages > 0 && (
                            <span className="rounded-full bg-plooy-gold px-2 py-0.5 text-xs font-semibold text-plooy-bg">
                              {unreadMessages}
                            </span>
                          )}
                        </Link>
                      )}
                      <Link
                        to={localizePath('/hesap')}
                        className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t('nav.account')}
                      </Link>
                      {activeProfile && (
                        <Link
                          to={localizePath('/izleme-gecmisi')}
                          className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          {t('nav.watchHistory')}
                        </Link>
                      )}
                      <button
                        type="button"
                        className="block w-full px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => {
                          clearActiveProfile()
                          setUserMenuOpen(false)
                          navigate(localizePath('/profiller'))
                        }}
                      >
                        {t('nav.switchProfile')}
                      </button>
                      <Link
                        to={localizePath('/planlar')}
                        className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t('nav.subscription')}
                      </Link>
                      <InstallAppMenuItem onNavigate={() => setUserMenuOpen(false)} />
                      <button
                        type="button"
                        className="block w-full px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
                        onClick={() => {
                          logout()
                          setUserMenuOpen(false)
                          navigate(localizePath('/'))
                        }}
                      >
                        {t('nav.logout')}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <InstallAppButton
                variant="ghost"
                className="hidden sm:inline-flex"
                label={t('nav.install')}
              />
              <Link
                to={localizePath('/giris')}
                className="hidden rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold md:inline-flex tv:px-5 tv:py-2.5 tv:text-base"
              >
                {t('nav.login')}
              </Link>
              <Link
                to={localizePath('/kayit')}
                className="rounded-md bg-plooy-gold px-3 py-2 text-sm font-bold text-plooy-bg transition hover:brightness-110 sm:px-5 sm:py-2.5"
              >
                {t('nav.signup')}
              </Link>
            </>
          )}

          <LanguageSwitcher className="inline-flex shrink-0" />

          <button
            type="button"
            aria-label={t('nav.menu')}
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
                  to={localizePath('/listem')}
                  className="block w-full rounded-lg px-3 py-3.5 text-base font-medium text-white/90 hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('nav.listem')}
                </Link>
              </li>
            )}
            {canOpenMessagesPage && (
              <li>
                <Link
                  to={localizePath('/mesajlar')}
                  className="flex items-center justify-between rounded-lg px-3 py-3.5 text-base font-medium text-white/90 hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{t('nav.messages')}</span>
                  {showMemberInbox && unreadMessages > 0 && (
                    <span className="rounded-full bg-plooy-gold px-2 py-0.5 text-xs font-semibold text-plooy-bg">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              </li>
            )}
            {user && !isCreator && (
              <li>
                <Link
                  to={localizePath('/planlar')}
                  className="block w-full rounded-lg px-3 py-3.5 text-base font-medium text-white/90 hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('nav.subscription')}
                </Link>
              </li>
            )}
            {!user && (
              <>
                <li>
                  <Link
                    to={localizePath('/planlar')}
                    className="block w-full rounded-lg px-3 py-3.5 text-base font-medium text-white/90 hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.plans')}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localizePath('/kayit')}
                    className="mt-2 block w-full rounded-lg bg-plooy-gold px-3 py-3 text-center text-sm font-semibold text-plooy-bg"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.signup')}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localizePath('/giris')}
                    className="block w-full rounded-lg px-3 py-3.5 text-center text-base font-medium text-white/90 hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.login')}
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
