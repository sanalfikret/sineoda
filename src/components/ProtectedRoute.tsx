import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { needsSubscriptionPayment, subscriptionCheckoutPath } from '../utils/billing'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireProfile?: boolean
  requireSubscription?: boolean
}

export function ProtectedRoute({
  children,
  requireProfile = false,
  requireSubscription = false,
}: ProtectedRouteProps) {
  const { user, activeProfile, isLoading, refreshUser } = useAuth()
  const [recovering, setRecovering] = useState(false)
  const token = getToken()

  useEffect(() => {
    if (isLoading || user || !token || recovering) return

    setRecovering(true)
    void refreshUser()
      .catch(() => undefined)
      .finally(() => setRecovering(false))
  }, [isLoading, user, token, recovering, refreshUser])

  if (isLoading || (token && !user && recovering)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/giris" replace />
  }

  if (requireSubscription && needsSubscriptionPayment(user)) {
    return <Navigate to={subscriptionCheckoutPath(user)} replace />
  }

  if (requireProfile && !activeProfile) {
    return <Navigate to="/profiller" replace />
  }

  return children
}
