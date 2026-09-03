import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken, refreshSessionToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { readCachedAuthUser } from '../../utils/authSession'

function isAdminRole(role: string | undefined) {
  return role === 'admin' || role === 'manager'
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading, refreshUser } = useAuth()
  const token = getToken()
  const cachedUser = readCachedAuthUser()
  const effectiveUser = user ?? (cachedUser && isAdminRole(cachedUser.role) ? cachedUser : null)
  const effectiveIsAdmin = isAdmin || isAdminRole(effectiveUser?.role)
  const [recoveringSession, setRecoveringSession] = useState(false)

  useEffect(() => {
    if (isLoading || effectiveUser || !token) return

    let cancelled = false
    setRecoveringSession(true)
    void (async () => {
      await refreshSessionToken()
      try {
        await refreshUser()
      } catch {
        /* cached admin oturumu korunur */
      } finally {
        if (!cancelled) setRecoveringSession(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoading, effectiveUser, token, refreshUser])

  if (isLoading || recoveringSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0d0f14]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/admin/giris" replace />
  }

  if (!effectiveUser || !effectiveIsAdmin) {
    return <Navigate to="/admin/giris" replace />
  }

  return children
}
