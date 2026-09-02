import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AdminContentActions } from './AdminContentActions'
import { PlooyLogo } from '../PlooyLogo'
import { useAuth } from '../../context/AuthContext'
import { getToken, refreshSessionToken } from '../../api/client'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/ana-sayfa', label: 'Ana Sayfa', end: false },
  { to: '/admin/yakinda', label: 'Yakında Modu', end: false },
  { to: '/admin/kategoriler', label: 'Kategoriler & Menü', end: false },
  { to: '/admin/icerikler', label: 'İçerikler', end: false },
  { to: '/admin/reklamlar', label: 'Reklamlar', end: false },
  { to: '/admin/yapimcilar', label: 'Yapımcılar', end: false },
  { to: '/admin/genc-sinema', label: 'Genç Sinema', end: false },
  { to: '/admin/cekim-notlari', label: 'Çekim Notları', end: false },
  { to: '/admin/kullanicilar', label: 'İzleyiciler', end: false },
  { to: '/admin/yasal', label: 'Yasal Metinler', end: false },
  { to: '/admin/planlar', label: 'Planlar & Fiyatlar', end: false },
  { to: '/admin/muhasebe', label: 'Muhasebe', end: false },
  { to: '/admin/dergi', label: 'Dergi', end: false },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const refresh = () => {
      void refreshSessionToken().then((ok) => {
        if (!ok && !getToken()) {
          logout()
          navigate('/admin/giris', { replace: true })
        }
      })
    }
    refresh()
    const interval = window.setInterval(refresh, 45 * 1000)
    return () => window.clearInterval(interval)
  }, [logout, navigate])

  const handleLogout = () => {
    logout()
    navigate('/admin/giris')
  }

  return (
    <div className="min-h-dvh bg-[#0d0f14] text-white">
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

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-plooy-gold/15 text-plooy-gold'
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

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
              onClick={handleLogout}
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
          <AdminContentActions />
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
