import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AdminLoginPage() {
  const { login, isAdmin, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@sineoda.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isLoading && isAdmin) {
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
    <div className="flex min-h-dvh items-center justify-center bg-[#0d0f14] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11141c] p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold text-white">Admin Girişi</h1>
            <p className="text-sm text-sineoda-muted">Sineoda yönetim paneli</p>
          </div>
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
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-white/90">Şifre</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sineoda-gold py-3 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
          >
            {loading ? 'Giriş yapılıyor...' : 'Panele Gir'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-sineoda-muted">
          Admin: admin@sineoda.com / admin123 · Demo: demo@sineoda.com / demo1234
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-sineoda-gold hover:underline">
            Ana siteye dön
          </Link>
        </p>
      </div>
    </div>
  )
}
