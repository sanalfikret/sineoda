import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  fetchBillingPlans,
  fetchSubscription,
  startCheckout,
  uploadBillingStudentId,
} from '../api/client'
import { PageFooter } from '../components/PageFooter'
import { PlooyLogo } from '../components/PlooyLogo'
import { useAuth } from '../context/AuthContext'

interface Plan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year' | 'once'
  audience?: 'viewer' | 'creator'
  features: string[]
  popular?: boolean
  requiresStudentId?: boolean
  enabled?: boolean
}

function planPriceSuffix(interval: Plan['interval']) {
  if (interval === 'once') return 'tek seferlik'
  if (interval === 'year') return '/yıl'
  return '/ay'
}

export function PricingPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [provider, setProvider] = useState<'paytr' | 'iyzico'>('paytr')
  const [providers, setProviders] = useState({ paytr: false, iyzico: false, paymentRequired: false })
  const [subscription, setSubscription] = useState<{
    status: string
    startedAt: string | null
    expiresAt: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null)
  const [studentIdReady, setStudentIdReady] = useState(Boolean(user?.studentIdUrl))
  const autoCheckoutStarted = useRef(false)

  const planParam = searchParams.get('plan')
  const autoCheckout = searchParams.get('checkout') === '1'

  useEffect(() => {
    setStudentIdReady(Boolean(user?.studentIdUrl))
  }, [user?.studentIdUrl])

  useEffect(() => {
    Promise.all([
      fetchBillingPlans(),
      user ? fetchSubscription().catch(() => null) : Promise.resolve(null),
    ])
      .then(([billing, sub]) => {
        setPlans(billing.plans.filter((plan) => plan.enabled !== false))
        setProviders(billing.providers)
        setProvider(billing.providers.default)
        if (sub) setSubscription({ status: sub.status, startedAt: sub.startedAt, expiresAt: sub.expiresAt })
      })
      .finally(() => setLoading(false))
  }, [user])

  const handleCheckout = useCallback(
    async (planId: string) => {
      if (!user) {
        navigate(`/giris?plan=${encodeURIComponent(planId)}`)
        return
      }

      const plan = plans.find((entry) => entry.id === planId)
      if (plan?.requiresStudentId && !studentIdReady) {
        if (!studentIdFile) {
          setMessage('Öğrenci planı için öğrenci kimliği yükleyin.')
          return
        }
        setCheckoutPlan(planId)
        setMessage('')
        try {
          await uploadBillingStudentId(studentIdFile)
          setStudentIdReady(true)
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Öğrenci kimliği yüklenemedi.')
          setCheckoutPlan(null)
          return
        }
      }

      setCheckoutPlan(planId)
      setMessage('')
      try {
        const result = await startCheckout(planId, provider)

        if ('demoMode' in result && result.demoMode) {
          setMessage(result.message)
          await refreshUser()
          const sub = await fetchSubscription()
          setSubscription({ status: sub.status, startedAt: sub.startedAt, expiresAt: sub.expiresAt })
          setSearchParams({}, { replace: true })
          return
        }

        if ('iframeUrl' in result && result.iframeUrl) {
          navigate(`/odeme/paytr?token=${encodeURIComponent(result.token)}`)
          return
        }

        if ('paymentPageUrl' in result && result.paymentPageUrl) {
          window.location.href = result.paymentPageUrl
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Ödeme başlatılamadı.')
      } finally {
        setCheckoutPlan(null)
      }
    },
    [user, plans, studentIdReady, studentIdFile, provider, navigate, setSearchParams, refreshUser],
  )

  useEffect(() => {
    if (loading || !user || !autoCheckout || !planParam || autoCheckoutStarted.current) return
    if (subscription?.status === 'active') return
    autoCheckoutStarted.current = true
    void handleCheckout(planParam)
  }, [loading, user, autoCheckout, planParam, subscription?.status, handleCheckout])

  return (
    <div className="min-h-dvh bg-sineoda-bg">
      <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <PlooyLogo tone="on-dark" linked linkTo="/" className="h-8" />
          <Link to={user ? '/hesap' : '/giris'} className="text-sm text-sineoda-gold hover:underline">
            {user ? 'Hesabım' : 'Giriş Yap'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sineoda-gold">Abonelik</p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Planını seç</h1>
          <p className="mt-2 text-sm text-sineoda-muted">
            Kredi kartınla güvenli ödeme — PayTR veya iyzico ile.
          </p>
          {(subscription?.status === 'active' || subscription?.status === 'expired') && (
            <div className="mt-3 space-y-1 text-sm text-emerald-300">
              <p>{subscription.status === 'active' ? 'Aktif abonelik' : 'Abonelik süresi doldu'}</p>
              {subscription.startedAt && (
                <p className="text-sineoda-muted">
                  Başlangıç: {new Date(subscription.startedAt).toLocaleDateString('tr-TR')}
                </p>
              )}
              {subscription.expiresAt && (
                <p className="text-sineoda-muted">
                  Bitiş: {new Date(subscription.expiresAt).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mx-auto mt-8 flex max-w-md justify-center gap-2">
          <button
            type="button"
            disabled={!providers.paytr}
            onClick={() => setProvider('paytr')}
            className={`rounded-full px-5 py-2 text-sm font-medium ${
              provider === 'paytr' ? 'bg-sineoda-gold text-sineoda-bg' : 'bg-white/10 text-white'
            } disabled:opacity-40`}
          >
            PayTR
          </button>
          <button
            type="button"
            disabled={!providers.iyzico}
            onClick={() => setProvider('iyzico')}
            className={`rounded-full px-5 py-2 text-sm font-medium ${
              provider === 'iyzico' ? 'bg-sineoda-gold text-sineoda-bg' : 'bg-white/10 text-white'
            } disabled:opacity-40`}
          >
            iyzico
          </button>
        </div>
        {!providers.paytr && !providers.iyzico && (
          <p className="mt-3 text-center text-sm text-sineoda-muted">
            Demo modu: ödeme anahtarları yok, plan seçince abonelik otomatik aktif olur.
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`rounded-2xl border p-8 ${
                  plan.popular
                    ? 'border-sineoda-gold/40 bg-sineoda-gold/5'
                    : 'border-white/10 bg-[#11141c]'
                }`}
              >
                {plan.popular && (
                  <span className="mb-3 inline-block rounded-full bg-sineoda-gold px-3 py-1 text-xs font-semibold text-sineoda-bg">
                    Öğrencilere özel
                  </span>
                )}
                <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                <p className="mt-2 text-4xl font-bold text-white">
                  ₺{plan.price}
                  <span className="text-sm font-normal text-sineoda-muted">
                    {plan.interval === 'once' ? '' : ' '}
                    {planPriceSuffix(plan.interval)}
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-white/80">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>

                {plan.requiresStudentId && user && !studentIdReady && (
                  <label className="mt-6 block">
                    <span className="mb-1.5 block text-sm font-medium text-white/90">Öğrenci kimliği</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(event) => setStudentIdFile(event.target.files?.[0] ?? null)}
                      className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-sineoda-gold file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sineoda-bg"
                    />
                  </label>
                )}

                {plan.requiresStudentId && studentIdReady && (
                  <p className="mt-6 text-xs text-emerald-300">Öğrenci kimliği yüklendi ✓</p>
                )}

                <button
                  type="button"
                  disabled={checkoutPlan === plan.id}
                  onClick={() => void handleCheckout(plan.id)}
                  className="mt-8 w-full rounded-lg bg-sineoda-gold py-3.5 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
                >
                  {checkoutPlan === plan.id ? 'Yönlendiriliyor...' : 'Kredi Kartı ile Öde'}
                </button>
              </article>
            ))}
          </div>
        )}

        {!user && (
          <p className="mt-8 text-center text-sm text-sineoda-muted">
            Henüz hesabın yok mu?{' '}
            <Link to="/kayit" className="font-medium text-sineoda-gold hover:underline">
              Kayıt ol
            </Link>
          </p>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        )}
      </main>

      <PageFooter />
    </div>
  )
}
