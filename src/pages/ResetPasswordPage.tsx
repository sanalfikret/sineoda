import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPasswordRequest } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'

export function ResetPasswordPage() {
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
      setError('Geçersiz sıfırlama bağlantısı.')
      return
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      return
    }

    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    try {
      const result = await resetPasswordRequest(token, password)
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre güncellenemedi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Yeni şifre belirle" subtitle="Hesabın için yeni bir şifre oluştur.">
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
              <Link to="/giris" className="font-medium text-sineoda-gold hover:underline">
                Giriş yap
              </Link>
            </p>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/90">Yeni şifre</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-3 text-white outline-none transition focus:border-sineoda-gold"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/90">Şifre tekrar</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-3 text-white outline-none transition focus:border-sineoda-gold"
              />
            </label>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-lg bg-sineoda-gold py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
            </button>
          </>
        )}
      </form>
    </AuthLayout>
  )
}
