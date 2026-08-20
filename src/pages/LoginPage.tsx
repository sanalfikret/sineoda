import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login, user, isCreator } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isCreator) {
      navigate('/creator', { replace: true })
      return
    }
    if (user) {
      navigate('/profiller', { replace: true })
    }
  }, [user, isCreator, navigate])

  if (isCreator) {
    return <Navigate to="/creator" replace />
  }

  if (user) {
    return <Navigate to="/profiller" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/profiller', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Tekrar hoş geldin" subtitle="Hesabına giriş yap ve izlemeye devam et.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/90">E-posta</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-3 text-white outline-none transition focus:border-sineoda-gold"
            placeholder="ornek@email.com"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-white/90">Şifre</span>
            <Link to="/sifremi-unuttum" className="text-xs text-sineoda-gold hover:underline">
              Şifremi unuttum
            </Link>
          </div>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-3 text-white outline-none transition focus:border-sineoda-gold"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sineoda-gold py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-sineoda-muted">
        Hesabın yok mu?{' '}
        <Link to="/kayit" className="font-medium text-sineoda-gold hover:underline">
          Kayıt ol
        </Link>
      </p>

      {from !== '/' && (
        <p className="mt-2 text-center text-xs text-sineoda-muted">
          Giriş yaptıktan sonra kaldığın yere döneceksin.
        </p>
      )}
    </AuthLayout>
  )
}
