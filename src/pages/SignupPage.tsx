import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { sendSmsCode, uploadStudentId } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { LEGAL_LINKS } from '../constants/legal'
import { useAuth } from '../context/AuthContext'
import { planDisplayName, postLoginPath } from '../utils/billing'

type SignupPlanId = 'standard' | 'student'

const SIGNUP_PLANS: {
  id: SignupPlanId
  name: string
  price: number
  note: string
  requiresStudentId?: boolean
}[] = [
  {
    id: 'standard',
    name: 'Standart Plan',
    price: 69,
    note: 'Tüm katalog, aylık yenilenir',
  },
  {
    id: 'student',
    name: 'Öğrenci Plan',
    price: 49,
    note: 'Geçerli öğrenci kimliği gerekir',
    requiresStudentId: true,
  },
]

export function SignupPage() {
  const { signup, user } = useAuth()
  const [searchParams] = useSearchParams()
  const initialPlan = searchParams.get('plan') === 'student' ? 'student' : 'standard'
  const [selectedPlan, setSelectedPlan] = useState<SignupPlanId>(initialPlan)
  const [name, setName] = useState('')
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [pendingPlan, setPendingPlan] = useState<SignupPlanId>('standard')
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)

  if (user) {
    return <Navigate to={postLoginPath(user)} replace />
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

    if (selectedPlan === 'student' && !studentIdFile) {
      setError('Öğrenci planı için öğrenci kimliği yüklemeniz gerekir.')
      return
    }

    setLoading(true)
    try {
      let studentIdUrl: string | undefined
      if (selectedPlan === 'student' && studentIdFile) {
        studentIdUrl = await uploadStudentId(studentIdFile)
      }

      const result = await signup(name, email, password, phone.trim(), smsCode.trim(), {
        planId: selectedPlan,
        studentIdUrl,
      })
      setPendingEmail(result.email)
      setPendingPlan((result.planId as SignupPlanId) ?? selectedPlan)
      setDevVerifyUrl(result.devVerifyUrl ?? null)
      setCompleted(true)
      setInfo(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title={completed ? 'E-postanı kontrol et' : "Plooy'a katıl"}
      subtitle={
        completed
          ? 'E-postanı doğrula, giriş yap — seçtiğin plan için kredi kartı ödeme adımına yönlendirileceksin.'
          : 'Planını seç, hesabını oluştur ve ödeme adımına geç.'
      }
    >
      {completed ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {info || 'Doğrulama e-postası gönderildi.'}
            {pendingEmail ? (
              <p className="mt-2 text-white/85">
                Gönderilen adres: <strong>{pendingEmail}</strong>
              </p>
            ) : null}
            <p className="mt-2 text-white/85">
              Seçilen plan: <strong>{planDisplayName(pendingPlan)}</strong>
            </p>
            {devVerifyUrl ? (
              <p className="mt-2 break-all text-xs text-white/70">
                Geliştirme modu bağlantısı:{' '}
                <a href={devVerifyUrl} className="text-plooy-gold underline">
                  {devVerifyUrl}
                </a>
              </p>
            ) : null}
          </div>
          <p className="text-sm text-plooy-muted">
            E-postayı doğruladıktan sonra giriş yap. Aktif aboneliğin yoksa doğrudan ödeme sayfasına
            yönlendirileceksin.
          </p>
          <Link
            to={`/eposta-dogrula?email=${encodeURIComponent(pendingEmail || email)}`}
            className="block w-full rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 py-3 text-center text-sm font-semibold text-plooy-gold"
          >
            Doğrulama E-postasını Yeniden Gönder
          </Link>
          <Link
            to="/giris"
            className="block w-full rounded-lg bg-plooy-gold py-3 text-center text-sm font-semibold text-plooy-bg"
          >
            Giriş Yap ve Ödemeye Geç
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-plooy-gold/30 bg-plooy-gold/10 px-4 py-3 text-sm text-plooy-gold">
              {info}
              {devCode && (
                <p className="mt-1 text-xs text-white/80">
                  Geliştirme modu kodu: <strong>{devCode}</strong>
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-white/90">Abonelik planı</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SIGNUP_PLANS.map((plan) => {
                const active = selectedPlan === plan.id
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlan(plan.id)
                      if (plan.id !== 'student') setStudentIdFile(null)
                    }}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-plooy-gold/50 bg-plooy-gold/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <p className="font-semibold text-white">{plan.name}</p>
                    <p className="mt-1 text-lg font-bold text-plooy-gold">
                      ₺{plan.price}
                      <span className="text-xs font-normal text-plooy-muted">/ay</span>
                    </p>
                    <p className="mt-1 text-xs text-plooy-muted">{plan.note}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedPlan === 'student' && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/90">Öğrenci kimliği</span>
              <input
                type="file"
                required
                accept="image/*,application/pdf"
                onChange={(event) => setStudentIdFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-white/10 bg-plooy-bg px-3 py-2.5 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-plooy-gold file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-plooy-bg"
              />
              <p className="mt-1 text-xs text-plooy-muted">JPG, PNG veya PDF — max 10 MB</p>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/90">Ad Soyad</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
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
              className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
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
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
                placeholder="5xx xxx xx xx"
              />
              <button
                type="button"
                disabled={sendingCode || !phone.trim()}
                onClick={() => void handleSendCode()}
                className="shrink-0 rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 px-3 py-3 text-xs font-semibold text-plooy-gold disabled:opacity-50 sm:text-sm"
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
              className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
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
              className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
              placeholder="En az 6 karakter"
            />
          </label>

          <p className="text-xs leading-relaxed text-plooy-muted">
            Kayıt olarak{' '}
            <Link to="/yasal/kullanim-kosullari" className="text-plooy-gold hover:underline">
              Kullanım Koşulları
            </Link>
            ,{' '}
            <Link to="/yasal/gizlilik-politikasi" className="text-plooy-gold hover:underline">
              Gizlilik Politikası
            </Link>{' '}
            ve{' '}
            <Link to="/yasal/kvkk-aydinlatma" className="text-plooy-gold hover:underline">
              KVKK Aydınlatma Metni
            </Link>
            &apos;ni kabul etmiş olursunuz.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-plooy-gold py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol ve Ödemeye Geç'}
          </button>
        </form>
      )}

      {!completed ? (
        <>
          <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-plooy-muted">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.slug} to={`/yasal/${link.slug}`} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-plooy-muted">
            Zaten hesabın var mı?{' '}
            <Link to="/giris" className="font-medium text-plooy-gold hover:underline">
              Giriş yap
            </Link>
          </p>
        </>
      ) : null}
    </AuthLayout>
  )
}
