import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { confirmEmailChangeRequest } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../i18n/LocaleContext'

export function EmailChangeConfirmPage() {
  const { t } = useTranslation('auth')
  const { localizePath } = useLocale()
  const { refreshUser } = useAuth()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return

    let cancelled = false
    setLoading(true)
    setError('')
    setMessage('')

    void confirmEmailChangeRequest(token)
      .then(async (result) => {
        if (cancelled) return
        setMessage(result.message)
        await refreshUser().catch(() => undefined)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('emailChangeConfirmFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, refreshUser, t])

  return (
    <AuthLayout title={t('emailChangeConfirmTitle')} subtitle={t('emailChangeConfirmSubtitle')}>
      {!token ? (
        <p className="text-sm text-red-300">{t('emailChangeInvalidLink')}</p>
      ) : loading ? (
        <p className="text-sm text-plooy-muted">{t('emailChangeConfirming')}</p>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : (
        <p className="text-sm text-emerald-200">{message}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to={localizePath('/giris')}
          className="rounded-lg bg-plooy-gold px-4 py-2.5 text-sm font-semibold text-plooy-bg"
        >
          {t('loginLink')}
        </Link>
        <Link
          to={localizePath('/hesap')}
          className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/90 hover:bg-white/5"
        >
          {t('emailChangeBackAccount')}
        </Link>
      </div>
    </AuthLayout>
  )
}
