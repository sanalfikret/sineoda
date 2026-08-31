import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { forgotPasswordRequest } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { useLocale } from '../i18n/LocaleContext'

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const { localizePath } = useLocale()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [devResetUrl, setDevResetUrl] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setDevResetUrl('')
    setLoading(true)

    try {
      const result = await forgotPasswordRequest(email.trim())
      setMessage(result.message)
      if (result.devResetUrl) setDevResetUrl(result.devResetUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requestFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('forgotPasswordTitle')} subtitle={t('forgotPasswordSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
            {devResetUrl && (
              <p className="mt-2 break-all text-xs text-emerald-100/80">
                {t('devMode')}{' '}
                <a href={devResetUrl} className="underline">
                  {devResetUrl}
                </a>
              </p>
            )}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/90">{t('email')}</span>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-plooy-gold py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? t('sending') : t('sendResetLink')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-plooy-muted">
        <Link to={localizePath('/giris')} className="font-medium text-plooy-gold hover:underline">
          {t('backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  )
}
