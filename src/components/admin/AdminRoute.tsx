import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { readCachedAuthUser } from '../../utils/authSession'

function isAdminRole(role: string | undefined) {
  return role === 'admin' || role === 'manager'
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth()
  const token = getToken()
  const cachedUser = readCachedAuthUser()
  const effectiveUser = user ?? (cachedUser && isAdminRole(cachedUser.role) ? cachedUser : null)
  const effectiveIsAdmin = isAdmin || isAdminRole(effectiveUser?.role)

  if (isLoading) {
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
