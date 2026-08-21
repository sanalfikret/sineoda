import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken } from '../api/client'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireProfile?: boolean
}

export function ProtectedRoute({ children, requireProfile = false }: ProtectedRouteProps) {
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
      <div className="flex min-h-dvh items-center justify-center bg-sineoda-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/giris" replace />
  }

  if (requireProfile && !activeProfile) {
    return <Navigate to="/profiller" replace />
  }

  return children
}
