import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSiteMode } from '../context/SiteModeContext'
import { useLocale } from '../i18n/LocaleContext'
import { BrowsePage } from '../pages/BrowsePage'
import { ComingSoonPage } from '../pages/ComingSoonPage'
import { LandingPage } from '../pages/LandingPage'
import { needsSubscriptionPayment, postLoginPath } from '../utils/billing'
import { AuthenticatedProviders } from './providers'
import { LegacyContentRedirect } from './redirects'

function RouteSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
    </div>
  )
}

export function HomeRoute() {
  const { user, activeProfile, isLoading, isCreator } = useAuth()
  const { loading: siteModeLoading, siteMode, canBypassComingSoon } = useSiteMode()
  const { localizePath } = useLocale()

  if (isLoading || siteModeLoading) return <RouteSpinner />

  if (siteMode?.enabled && !canBypassComingSoon) {
    if (user && isCreator) return <Navigate to={localizePath('/creator')} replace />
    return <ComingSoonPage />
  }

  if (user && isCreator) return <Navigate to={localizePath('/creator')} replace />

  if (user && needsSubscriptionPayment(user)) {
    return <Navigate to={localizePath(postLoginPath(user))} replace />
  }

  if (user && activeProfile) {
    return (
      <AuthenticatedProviders>
        <BrowsePage />
      </AuthenticatedProviders>
    )
  }

  if (user && !activeProfile) return <Navigate to={localizePath('/profiller')} replace />

  return (
    <>
      <LegacyContentRedirect />
      <LandingPage />
    </>
  )
}

export function TanitimRoute() {
  const { loading, siteMode, canBypassComingSoon } = useSiteMode()

  if (loading) return <RouteSpinner />

  if (siteMode?.enabled && !canBypassComingSoon) return <ComingSoonPage />

  return <LandingPage />
}
