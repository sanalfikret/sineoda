import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading, sessionToken } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0d0f14]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (!sessionToken || !user || !isAdmin) {
    return <Navigate to="/admin/giris" replace />
  }

  return children
}
