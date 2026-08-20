import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_NAV_ITEMS } from '../../constants/navigation'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg" />
            <div>
              <p className="font-bold leading-tight">
                Sine<span className="text-sineoda-gold">oda</span>
              </p>
              <p className="text-xs text-sineoda-muted">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sineoda-gold/15 text-sineoda-gold'
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
          <p className="truncate text-xs text-sineoda-muted">{user?.email}</p>
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
          <p className="text-sm text-sineoda-muted lg:hidden">Admin Panel</p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Link
              to="/admin/genc-sinema"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
            >
              Genç Sinema
            </Link>
            <Link
              to="/admin/icerikler/yeni?dikey=1"
              className="rounded-lg border border-sineoda-gold/50 bg-sineoda-gold/10 px-4 py-2 text-sm font-semibold text-sineoda-gold transition hover:bg-sineoda-gold/20"
            >
              + Dikey Dizi
            </Link>
            <Link
              to="/admin/icerikler/yeni"
              className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              + Yeni İçerik
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
