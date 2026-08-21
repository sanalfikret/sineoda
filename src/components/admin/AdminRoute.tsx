import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading, refreshUser } = useAuth()
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
      <div className="flex min-h-dvh items-center justify-center bg-[#0d0f14]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  if (!token || !user || !isAdmin) {
    return <Navigate to="/admin/giris" replace />
  }

  return children
}
