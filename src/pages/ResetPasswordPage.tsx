import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resetPasswordRequest } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { useLocale } from '../i18n/LocaleContext'

export function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const { localizePath } = useLocale()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError(t('invalidResetLink'))
      return
    }

    if (password.length < 6) {
      setError(t('passwordMinLength'))
      return
    }

    if (password !== confirm) {
      setError(t('passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const result = await resetPasswordRequest(token, password)
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('passwordUpdateFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('resetPasswordTitle')} subtitle={t('resetPasswordSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
            <p className="mt-3">
              <Link to={localizePath('/giris')} className="font-medium text-plooy-gold hover:underline">
                {t('loginLink')}
              </Link>
            </p>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/90">{t('newPassword')}</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/90">{t('confirmPassword')}</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
              />
            </label>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-lg bg-plooy-gold py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? t('saving') : t('updatePassword')}
            </button>
          </>
        )}
      </form>
    </AuthLayout>
  )
}
