import { Link } from 'react-router-dom'
import { SiteFooter } from '../SiteFooter'

export function CreatorAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0d0f14]">
      <header className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/5 hover:text-white"
          >
            ← Ana sayfaya git
          </Link>
          <Link to="/" className="flex items-center gap-2 text-white/90">
            <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg" />
            <span className="hidden text-sm font-semibold sm:inline">Sineoda</span>
          </Link>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <SiteFooter />
    </div>
  )
}
