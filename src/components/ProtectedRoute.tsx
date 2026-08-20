import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireProfile?: boolean
}

export function ProtectedRoute({ children, requireProfile = false }: ProtectedRouteProps) {
  const { user, activeProfile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sineoda-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/giris" replace />
  }

  if (requireProfile && !activeProfile) {
    return <Navigate to="/profiller" replace />
  }

  return children
}
