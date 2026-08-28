import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resendVerificationRequest, verifyEmailRequest } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const emailParam = searchParams.get('email') ?? ''
  const [email, setEmail] = useState(emailParam)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(token))
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) return

    let cancelled = false
    setLoading(true)
    setError('')
    setMessage('')

    void verifyEmailRequest(token)
      .then((result) => {
        if (!cancelled) setMessage(result.message)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Doğrulama başarısız.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Yeniden göndermek için e-posta adresini gir.')
      return
    }

    setResending(true)
    setError('')
    setMessage('')
    try {
      const result = await resendVerificationRequest(email.trim())
      setMessage(result.message)
      if (result.devVerifyUrl) {
        setMessage(`${result.message} Geliştirme bağlantısı: ${result.devVerifyUrl}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-posta gönderilemedi.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout
      title={token ? 'E-posta doğrulanıyor' : 'E-postanı doğrula'}
      subtitle={
        token
          ? 'Hesabın etkinleştiriliyor…'
          : 'Kayıt sonrası gönderilen bağlantıya tıklamadan giriş yapamazsın.'
      }
    >
      {loading ? (
        <p className="text-sm text-sineoda-muted">Doğrulama bağlantısı kontrol ediliyor…</p>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
          <p className="mt-3 text-white/85">
            Giriş yaptıktan sonra seçtiğin plan için kredi kartı ödeme adımına yönlendirileceksin.
          </p>
          <p className="mt-3">
            <Link to="/giris" className="font-medium text-sineoda-gold hover:underline">
              Giriş yap ve ödemeye geç
            </Link>
          </p>
        </div>
      ) : null}

      {!loading && !message ? (
        <div className="space-y-4">
          <p className="text-sm text-sineoda-muted">
            E-postandaki &quot;E-postamı Doğrula&quot; bağlantısına tıkla. Bağlantı gelmediyse aşağıdan yeniden
            gönderebilirsin.
          </p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/90">E-posta</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-3 text-white outline-none transition focus:border-sineoda-gold"
              placeholder="ornek@email.com"
            />
          </label>
          <button
            type="button"
            disabled={resending}
            onClick={() => void handleResend()}
            className="w-full rounded-lg border border-sineoda-gold/40 bg-sineoda-gold/10 py-3 text-sm font-semibold text-sineoda-gold disabled:opacity-60"
          >
            {resending ? 'Gönderiliyor…' : 'Doğrulama E-postasını Yeniden Gönder'}
          </button>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-sineoda-muted">
        <Link to="/giris" className="font-medium text-sineoda-gold hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </AuthLayout>
  )
}
