import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PlooyLogo } from '../../components/PlooyLogo'
import { getToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../i18n/LocaleContext'
import { appConfig } from '../../config/appConfig'

export function AdminLoginPage() {
  const { login, isAdmin, isLoading } = useAuth()
  const { localizePath } = useLocale()
  const navigate = useNavigate()
  const [email, setEmail] = useState(appConfig.emails.admin)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isLoading && getToken() && isAdmin) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password, { requireAdmin: true })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0d0f14]">
      <header className="safe-top mx-auto w-full max-w-md px-4 pt-10 sm:px-6 sm:pt-12">
        <button
          type="button"
          onClick={() => navigate(localizePath('/'))}
          className="inline-flex min-h-11 items-center rounded-md px-1 py-2 text-sm text-plooy-muted transition hover:text-white"
        >
          ← Geri
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <PlooyLogo tone="on-dark" linked linkTo={localizePath('/')} className="h-10 sm:h-12" />
          </div>

        <div className="rounded-2xl border border-white/10 bg-[#11141c] p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-white">Admin Girişi</h1>
            <p className="mt-1 text-sm text-plooy-muted">Plooy yönetim paneli</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/90">E-posta</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-plooy-gold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/90">Şifre</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-plooy-gold"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-plooy-gold py-3 text-sm font-semibold text-plooy-bg disabled:opacity-60"
            >
              {loading ? 'Giriş yapılıyor...' : 'Panele Gir'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-plooy-muted">
            Test: {appConfig.emails.admin} / admin123
          </p>
        </div>
        </div>
      </div>

      <p className="safe-bottom pb-8 text-center">
        <Link to={localizePath('/')} className="text-sm font-medium text-plooy-gold hover:underline">
          Ana sayfaya dön
        </Link>
      </p>
    </div>
  )
}
