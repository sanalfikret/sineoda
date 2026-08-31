import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSiteMode } from '../context/SiteModeContext'
import { useLocale } from '../i18n/LocaleContext'

interface SiteModeGuardProps {
  children: ReactNode
  /** signup: allowViewerSignup açıksa /kayit ve /planlar geçer */
  mode?: 'browse' | 'signup'
}

export function SiteModeGuard({ children, mode = 'browse' }: SiteModeGuardProps) {
  const { loading, siteMode, canBypassComingSoon } = useSiteMode()
  const { localizePath } = useLocale()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (!canBypassComingSoon && siteMode?.enabled) {
    if (mode === 'signup' && siteMode.allowViewerSignup) {
      return children
    }
    return <Navigate to={localizePath('/')} replace />
  }

  return children
}
