import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { SiteFooter } from './SiteFooter'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-sineoda-bg">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=900&fit=crop)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-sineoda-bg/60 via-sineoda-bg/90 to-sineoda-bg" />

      <div className="safe-top relative z-10 px-4 py-6 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg" />
          <span className="text-2xl font-bold text-white">
            Sine<span className="text-sineoda-gold">oda</span>
          </span>
        </Link>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md items-center px-4 pb-12 sm:px-6">
        <div className="w-full rounded-2xl border border-white/10 bg-sineoda-surface/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-sineoda-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
