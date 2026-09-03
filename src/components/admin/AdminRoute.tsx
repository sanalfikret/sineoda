import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken, refreshSessionToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading, refreshUser } = useAuth()
  const token = getToken()
  const [recoveringSession, setRecoveringSession] = useState(false)

  useEffect(() => {
    if (!token) {
      setRecoveringSession(false)
      return
    }

    if (isLoading || user) {
      setRecoveringSession(false)
      return
    }

    let cancelled = false
    setRecoveringSession(true)

    void (async () => {
      try {
        await refreshSessionToken()
        await refreshUser()
      } catch {
        /* oturum geçersiz — login sayfasına yönlendirilir */
      } finally {
        if (!cancelled) setRecoveringSession(false)
      }
    })()

    return () => {
      cancelled = true
      setRecoveringSession(false)
    }
  }, [isLoading, user, token, refreshUser])

  if (!token) {
    return <Navigate to="/admin/giris" replace />
  }

  if (isLoading || recoveringSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0d0f14]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/giris" replace />
  }

  return children
}
