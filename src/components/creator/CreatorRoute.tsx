import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function CreatorRoute({ children }: { children?: React.ReactNode }) {
  const { user, isLoading, isCreator } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sineoda-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  if (!user || !isCreator) {
    return <Navigate to="/creator/giris" replace />
  }

  return children ?? <Outlet />
}
