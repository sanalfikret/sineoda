import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../i18n/LocaleContext'

export function CreatorRoute({ children }: { children?: React.ReactNode }) {
  const { user, isLoading, isCreator } = useAuth()
  const { localizePath } = useLocale()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (!user || !isCreator) {
    return <Navigate to={localizePath('/creator/giris')} replace />
  }

  return children ?? <Outlet />
}
