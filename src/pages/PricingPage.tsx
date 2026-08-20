import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchBillingPlans, fetchSubscription, startCheckout } from '../api/client'
import { PageFooter } from '../components/PageFooter'
import { useAuth } from '../context/AuthContext'

interface Plan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
}

export function PricingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [provider, setProvider] = useState<'paytr' | 'iyzico'>('paytr')
  const [providers, setProviders] = useState({ paytr: false, iyzico: false, paymentRequired: false })
  const [subscription, setSubscription] = useState<{ status: string; expiresAt: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      fetchBillingPlans(),
      user ? fetchSubscription().catch(() => null) : Promise.resolve(null),
    ])
      .then(([billing, sub]) => {
        setPlans(billing.plans)
        setProviders(billing.providers)
        setProvider(billing.providers.default)
        if (sub) setSubscription({ status: sub.status, expiresAt: sub.expiresAt })
      })
      .finally(() => setLoading(false))
  }, [user])

  const handleCheckout = async (planId: string) => {
    if (!user) {
      navigate('/giris')
      return
    }

    setCheckoutPlan(planId)
    setMessage('')
    try {
      const result = await startCheckout(planId, provider)

      if ('demoMode' in result && result.demoMode) {
        setMessage(result.message)
        const sub = await fetchSubscription()
        setSubscription({ status: sub.status, expiresAt: sub.expiresAt })
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
  }

  return (
    <div className="min-h-dvh bg-sineoda-bg">
      <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg" />
            <span className="text-2xl font-bold text-white">
              Sine<span className="text-sineoda-gold">oda</span>
            </span>
          </Link>
          <Link to="/giris" className="text-sm text-sineoda-gold hover:underline">
            {user ? 'Hesabım' : 'Giriş Yap'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sineoda-gold">Abonelik</p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Planını seç</h1>
          {subscription?.status === 'active' && (
            <p className="mt-3 text-sm text-emerald-300">
              Aktif abonelik
              {subscription.expiresAt
                ? ` · ${new Date(subscription.expiresAt).toLocaleDateString('tr-TR')} tarihine kadar`
                : ''}
            </p>
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
                    En popüler
                  </span>
                )}
                <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                <p className="mt-2 text-4xl font-bold text-white">
                  ₺{plan.price}
                  <span className="text-sm font-normal text-sineoda-muted">
                    /{plan.interval === 'month' ? 'ay' : 'yıl'}
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-white/80">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={checkoutPlan === plan.id}
                  onClick={() => void handleCheckout(plan.id)}
                  className="mt-8 w-full rounded-lg bg-sineoda-gold py-3.5 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
                >
                  {checkoutPlan === plan.id ? 'Yönlendiriliyor...' : 'Planı Seç'}
                </button>
              </article>
            ))}
          </div>
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
