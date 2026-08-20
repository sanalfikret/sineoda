import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { sendSmsCode } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { LEGAL_LINKS } from '../constants/legal'
import { useAuth } from '../context/AuthContext'

export function SignupPage() {
  const { signup, user, isCreator } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)

  if (isCreator) {
    return <Navigate to="/creator" replace />
  }

  if (user) {
    return <Navigate to="/profiller" replace />
  }

  const handleSendCode = async () => {
    setError('')
    setInfo('')
    setDevCode(null)
    setSendingCode(true)
    try {
      const result = await sendSmsCode(phone.trim())
      setCodeSent(true)
      setInfo(result.message)
      if (result.devCode) {
        setDevCode(result.devCode)
        setSmsCode(result.devCode)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMS gönderilemedi.')
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!codeSent) {
      setError('Önce telefonunuza doğrulama kodu gönderin.')
      return
    }

    setLoading(true)
    try {
      await signup(name, email, password, phone.trim(), smsCode.trim())
      navigate('/profiller', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Sineoda'ya katıl"
      subtitle="Ücretsiz hesap oluştur, binlerce içeriği keşfet."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-lg border border-sineoda-gold/30 bg-sineoda-gold/10 px-4 py-3 text-sm text-sineoda-gold">
            {info}
            {devCode && (
              <p className="mt-1 text-xs text-white/80">
                Geliştirme modu kodu: <strong>{devCode}</strong>
              </p>
            )}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/90">Ad Soyad</span>
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-3 text-white outline-none transition focus:border-sineoda-gold"
            placeholder="Adın"
          />
        </label>

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
          <span className="mb-1.5 block text-sm font-medium text-white/90">Cep Telefonu</span>
          <div className="flex gap-2">
            <input
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                setCodeSent(false)
              }}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-sineoda-bg px-4 py-3 text-white outline-none transition focus:border-sineoda-gold"
              placeholder="5xx xxx xx xx"
            />
            <button
              type="button"
              disabled={sendingCode || !phone.trim()}
              onClick={() => void handleSendCode()}
              className="shrink-0 rounded-lg border border-sineoda-gold/40 bg-sineoda-gold/10 px-3 py-3 text-xs font-semibold text-sineoda-gold disabled:opacity-50 sm:text-sm"
            >
              {sendingCode ? '...' : 'Kod Gönder'}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/90">SMS Doğrulama Kodu</span>
          <input
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={smsCode}
            onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-3 text-white outline-none transition focus:border-sineoda-gold"
            placeholder="6 haneli kod"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/90">Şifre</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-3 text-white outline-none transition focus:border-sineoda-gold"
            placeholder="En az 6 karakter"
          />
        </label>

        <p className="text-xs leading-relaxed text-sineoda-muted">
          Kayıt olarak{' '}
          <Link to="/yasal/kullanim-kosullari" className="text-sineoda-gold hover:underline">
            Kullanım Koşulları
          </Link>
          ,{' '}
          <Link to="/yasal/gizlilik-politikasi" className="text-sineoda-gold hover:underline">
            Gizlilik Politikası
          </Link>{' '}
          ve{' '}
          <Link to="/yasal/kvkk-aydinlatma" className="text-sineoda-gold hover:underline">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni kabul etmiş olursunuz.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sineoda-gold py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-sineoda-muted">
        {LEGAL_LINKS.map((link) => (
          <Link key={link.slug} to={`/yasal/${link.slug}`} className="hover:text-white">
            {link.label}
          </Link>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-sineoda-muted">
        Zaten hesabın var mı?{' '}
        <Link to="/giris" className="font-medium text-sineoda-gold hover:underline">
          Giriş yap
        </Link>
      </p>
    </AuthLayout>
  )
}
