import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { CREATOR_LEGAL_TERMS } from '../../constants/creatorLegal'

export function CreatorRegisterPage() {
  const { creatorSignup, isCreator, isLoading } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [studioName, setStudioName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bio, setBio] = useState('')
  const [acceptLegal, setAcceptLegal] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isLoading && isCreator) {
    return <Navigate to="/creator" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!acceptLegal) {
      setError('Yasal şartları kabul etmelisiniz.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await creatorSignup({ name, email, password, studioName, bio, acceptLegal })
      navigate('/creator', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#0d0f14] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="text-2xl font-bold text-white">Yapımcı Kaydı</h1>
            <p className="text-sm text-sineoda-muted">Bağımsız sinemanızı Sineoda'da yayınlayın</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-[#11141c] p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/90">Ad Soyad</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/90">Stüdyo / Yapım Adı</span>
              <input
                required
                value={studioName}
                onChange={(event) => setStudioName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
              />
            </label>
          </div>

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
            <span className="mb-1.5 block text-sm text-white/90">Şifre (en az 6 karakter)</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm text-white/90">Kısa biyografi (isteğe bağlı)</span>
            <textarea
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
            />
          </label>

          <div className="rounded-xl border border-white/10 bg-[#0d0f14] p-4">
            <p className="text-sm font-medium text-white">Yasal şartlar ve sorumluluk beyanı</p>
            <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-sineoda-muted">
              {CREATOR_LEGAL_TERMS}
            </pre>
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptLegal}
                onChange={(event) => setAcceptLegal(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 accent-sineoda-gold"
              />
              <span className="text-sm text-white/90">
                Filminin bana ait olduğunu belgeleyeceğimi, tüm yasal sorumluluğun bana ait olduğunu
                ve gelir paylaşımı koşullarının yapımcı anlaşmasında belirtildiğini kabul ediyorum.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sineoda-gold py-3 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
          >
            {loading ? 'Kayıt oluşturuluyor...' : 'Yapımcı Hesabı Oluştur'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-sineoda-muted">
          Zaten hesabınız var mı?{' '}
          <Link to="/creator/giris" className="text-sineoda-gold hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  )
}
