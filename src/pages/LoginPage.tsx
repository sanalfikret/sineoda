import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../i18n/LocaleContext'
import { postLoginPath } from '../utils/billing'

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const { localizePath } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const rawFrom = (location.state as { from?: string } | null)?.from
  const loginPath = localizePath('/giris')
  const from =
    rawFrom && rawFrom !== loginPath ? rawFrom : localizePath('/')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const loggedInUser = await login(email, password)
      navigate(localizePath(postLoginPath(loggedInUser)), { replace: true })
    } catch (err) {
      const authError = err as Error & { code?: string; email?: string }
      if (authError.code === 'EMAIL_NOT_VERIFIED') {
        setResendEmail(authError.email ?? email)
      }
      setError(authError.message || t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} backTo={from}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
            {resendEmail ? (
              <p className="mt-3">
                <Link
                  to={`${localizePath('/eposta-dogrula')}?email=${encodeURIComponent(resendEmail)}`}
                  className="font-medium text-plooy-gold hover:underline"
                >
                  {t('auth.resendVerification')}
                </Link>
              </p>
            ) : null}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/90">{t('auth.email')}</span>
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
            <span className="text-sm font-medium text-white/90">{t('auth.password')}</span>
            <Link to={localizePath('/sifremi-unuttum')} className="text-xs text-plooy-gold hover:underline">
              {t('auth.forgotPassword')}
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
          {loading ? t('auth.loginSubmitting') : t('auth.loginSubmit')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-plooy-muted">
        {t('auth.noAccount')}{' '}
        <Link to={localizePath('/kayit')} className="font-medium text-plooy-gold hover:underline">
          {t('auth.signupLink')}
        </Link>
      </p>

      {from !== localizePath('/') && (
        <p className="mt-2 text-center text-xs text-plooy-muted">
          {t('auth.redirectAfterLogin')}
        </p>
      )}
    </AuthLayout>
  )
}
