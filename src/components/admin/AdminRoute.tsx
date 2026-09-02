import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isAuthSessionError, readCachedAuthUser } from '../../utils/authSession'

function isAdminRole(role: string | undefined) {
  return role === 'admin' || role === 'manager'
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading, refreshUser } = useAuth()
  const [recovering, setRecovering] = useState(false)
  const [sessionInvalid, setSessionInvalid] = useState(false)
  const token = getToken()
  const cachedUser = readCachedAuthUser()
  const effectiveUser = user ?? (cachedUser && isAdminRole(cachedUser.role) ? cachedUser : null)
  const effectiveIsAdmin = isAdmin || isAdminRole(effectiveUser?.role)

  useEffect(() => {
    if (isLoading || user || !token || recovering || sessionInvalid) return

    setRecovering(true)
    void refreshUser()
      .catch((err) => {
        if (isAuthSessionError(err)) setSessionInvalid(true)
      })
      .finally(() => setRecovering(false))
  }, [isLoading, user, token, recovering, sessionInvalid, refreshUser])

  if (isLoading || (token && !user && recovering)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0d0f14]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (!token || sessionInvalid || !effectiveUser || !effectiveIsAdmin) {
    return <Navigate to="/admin/giris" replace />
  }

  return children
}
