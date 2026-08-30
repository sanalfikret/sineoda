import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { postLoginPath } from '../utils/billing'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const loggedInUser = await login(email, password)
      navigate(postLoginPath(loggedInUser), { replace: true })
    } catch (err) {
      const authError = err as Error & { code?: string; email?: string }
      if (authError.code === 'EMAIL_NOT_VERIFIED') {
        setResendEmail(authError.email ?? email)
      }
      setError(authError.message || 'Giriş başarısız.')
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
            {resendEmail ? (
              <p className="mt-3">
                <Link
                  to={`/eposta-dogrula?email=${encodeURIComponent(resendEmail)}`}
                  className="font-medium text-plooy-gold hover:underline"
                >
                  Doğrulama e-postasını yeniden gönder
                </Link>
              </p>
            ) : null}
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
            className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
            placeholder="ornek@email.com"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-white/90">Şifre</span>
            <Link to="/sifremi-unuttum" className="text-xs text-plooy-gold hover:underline">
              Şifremi unuttum
            </Link>
          </div>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-plooy-gold py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-plooy-muted">
        Hesabın yok mu?{' '}
        <Link to="/kayit" className="font-medium text-plooy-gold hover:underline">
          Kayıt ol
        </Link>
      </p>

      {from !== '/' && (
        <p className="mt-2 text-center text-xs text-plooy-muted">
          Giriş yaptıktan sonra ödeme adımına yönlendirileceksin.
        </p>
      )}
    </AuthLayout>
  )
}
