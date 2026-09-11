import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { adminLogout, refreshSessionToken } from '../../api/client'
import { AdminContentActions } from './AdminContentActions'
import { PlooyLogo } from '../PlooyLogo'
import { useAuth } from '../../context/AuthContext'
import { AdminMessagesProvider, useAdminMessages } from '../../context/AdminMessagesContext'

const navItems = [
  { to: '/admin', label: 'Özet', end: true },
  { to: '/admin/ana-sayfa', label: 'Ana Sayfa', end: false },
  { to: '/admin/yakinda', label: 'Açılış & Davet', end: false },
  { to: '/admin/kategoriler', label: 'Kategoriler & Menü', end: false },
  { to: '/admin/icerikler', label: 'İçerikler', end: false },
  { to: '/admin/reklamlar', label: 'Reklamlar', end: false },
  { to: '/admin/mesajlar', label: 'Mesajlar', end: false, badge: 'messages' as const },
  { to: '/admin/yapimcilar', label: 'Yapımcılar', end: false },
  { to: '/admin/genc-sinema', label: 'Genç Sinema', end: false },
  { to: '/admin/cekim-notlari', label: 'Çekim Notları', end: false },
  { to: '/admin/kullanicilar', label: 'İzleyiciler', end: false },
  { to: '/admin/yasal', label: 'Yasal Metinler', end: false },
  { to: '/admin/planlar', label: 'Planlar & Fiyatlar', end: false },
  { to: '/admin/muhasebe', label: 'Muhasebe', end: false },
  { to: '/admin/dergi', label: 'Dergi', end: false },
]

function UnreadBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={`inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-black ${className}`}
      aria-label={`${count} okunmamış mesaj`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function HeaderMessagesButton() {
  const { summary, loaded } = useAdminMessages()
  return (
    <Link
      to="/admin/mesajlar"
      className={`relative inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        summary.unread > 0
          ? 'border-amber-400/50 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
          : 'border-white/10 text-white/80 hover:bg-white/5'
      }`}
      title={loaded ? `${summary.unread} okunmamış · ${summary.read} okunmuş` : 'Mesajlar'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5V17A2.5 2.5 0 0 1 4 14.5v-8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Mesajlar</span>
      <UnreadBadge count={summary.unread} />
    </Link>
  )
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const { summary } = useAdminMessages()
  return (
    <nav className="flex-1 space-y-1 p-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-plooy-gold/15 text-plooy-gold'
                : 'text-white/75 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <span>{item.label}</span>
          {item.badge === 'messages' && <UnreadBadge count={summary.unread} />}
        </NavLink>
      ))}
    </nav>
  )
}

export function AdminLayout() {
  return (
    <AdminMessagesProvider>
      <AdminLayoutInner />
    </AdminMessagesProvider>
  )
}

function AdminLayoutInner() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      void Promise.all(regs.map((reg) => reg.unregister()))
    })
  }, [])

  useEffect(() => {
    const renewSession = () => {
      if (document.visibilityState !== 'visible') return
      void refreshSessionToken().catch(() => undefined)
    }
    window.addEventListener('focus', renewSession)
    document.addEventListener('visibilitychange', renewSession)
    void refreshSessionToken().catch(() => undefined)
    return () => {
      window.removeEventListener('focus', renewSession)
      document.removeEventListener('visibilitychange', renewSession)
    }
  }, [])

  return (
    <div className="admin-panel min-h-dvh bg-[#0d0f14] text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#11141c] transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <Link to="/admin" className="block">
            <PlooyLogo tone="on-dark" className="h-6" />
            <p className="mt-1 text-xs text-plooy-muted">Admin Panel</p>
          </Link>
        </div>

        <SidebarNav onNavigate={() => setSidebarOpen(false)} />

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-plooy-muted">{user?.email}</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              to="/"
              className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs text-white/80 hover:bg-white/5"
            >
              Siteye Git
            </Link>
            <button
              type="button"
              onClick={adminLogout}
              className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0d0f14]/95 px-4 py-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-white/80 hover:bg-white/5 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-sm text-plooy-muted lg:hidden">Admin Panel</p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <HeaderMessagesButton />
            <AdminContentActions />
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
