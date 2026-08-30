import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CreatorAuthLayout } from '../../components/creator/CreatorAuthLayout'
import { PlooyLogo } from '../../components/PlooyLogo'
import { useAuth } from '../../context/AuthContext'

export function CreatorLoginPage() {
  const { creatorLogin, isCreator, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isLoading && isCreator) {
    return <Navigate to="/creator" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await creatorLogin(email, password)
      navigate('/creator', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CreatorAuthLayout>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <PlooyLogo tone="on-dark" linked className="h-10 sm:h-12" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#11141c] p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-white">Yapımcı Girişi</h1>
            <p className="mt-1 text-sm text-plooy-muted">Plooy Creator Paneli</p>
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

          <p className="mt-6 text-center text-sm text-plooy-muted">
            Hesabınız yok mu?{' '}
            <Link to="/creator/kayit" className="text-plooy-gold hover:underline">
              Yapımcı kaydı
            </Link>
          </p>
        </div>
      </div>
    </CreatorAuthLayout>
  )
}
