import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  fetchBillingPlans,
  fetchSubscription,
  redeemGiftCode,
  startCheckout,
  uploadBillingStudentId,
} from '../api/client'
import { PageFooter } from '../components/PageFooter'
import { PlooyLogo } from '../components/PlooyLogo'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../i18n/LocaleContext'

interface Plan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year' | 'once'
  audience?: 'viewer' | 'creator'
  features: string[]
  popular?: boolean
  requiresStudentId?: boolean
  campaignLabel?: string
}

type PlanAction = 'subscribe' | 'current' | 'switch' | 'renew'

function resolvePlanAction(
  planId: string,
  subscription: { status: string; plan: string | null } | null,
  hasUser: boolean,
): PlanAction {
  if (!hasUser) return 'subscribe'
  if (!subscription) return 'subscribe'
  if (subscription.status === 'active' && subscription.plan === planId) return 'current'
  if (subscription.status === 'active' || subscription.status === 'cancelled') return 'switch'
  if (subscription.status === 'expired') return 'renew'
  return 'subscribe'
}

export function PricingPage() {
  const { t } = useTranslation('pricing')
  const { localizePath, locale } = useLocale()
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [provider, setProvider] = useState<'paytr' | 'iyzico'>('paytr')
  const [providers, setProviders] = useState({
    paytr: false,
    iyzico: false,
    paymentRequired: false,
    paymentReady: false,
  })
  const [subscription, setSubscription] = useState<{
    status: string
    plan: string | null
    startedAt: string | null
    expiresAt: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [giftCode, setGiftCode] = useState('')
  const [redeemingGift, setRedeemingGift] = useState(false)
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null)
  const [studentIdReady, setStudentIdReady] = useState(Boolean(user?.studentIdUrl))
  const autoCheckoutStarted = useRef(false)

  const planParam = searchParams.get('plan')
  const autoCheckout = searchParams.get('checkout') === '1'
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR'

  const currentPlanName = useMemo(
    () => plans.find((plan) => plan.id === subscription?.plan)?.name ?? subscription?.plan,
    [plans, subscription?.plan],
  )

  const planPriceSuffix = (interval: Plan['interval']) => {
    if (interval === 'once') return t('intervalOnce')
    if (interval === 'year') return t('intervalYear')
    return t('intervalMonth')
  }

  useEffect(() => {
    setStudentIdReady(Boolean(user?.studentIdUrl))
  }, [user?.studentIdUrl])

  useEffect(() => {
    Promise.all([
      fetchBillingPlans(),
      user ? fetchSubscription().catch(() => null) : Promise.resolve(null),
    ])
      .then(([billing, sub]) => {
        setPlans(billing.plans.filter((plan) => plan.enabled !== false && plan.audience !== 'creator'))
        setProviders(billing.providers)
        setProvider('paytr')
        if (sub) {
          setSubscription({
            status: sub.status,
            plan: sub.plan,
            startedAt: sub.startedAt,
            expiresAt: sub.expiresAt,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  const handleCheckout = useCallback(
    async (planId: string) => {
      if (!user) {
        navigate(`${localizePath('/giris')}?plan=${encodeURIComponent(planId)}`)
        return
      }

      const plan = plans.find((entry) => entry.id === planId)
      if (plan?.requiresStudentId && !studentIdReady) {
        if (!studentIdFile) {
          setMessage(t('studentIdRequired'))
          return
        }
        setCheckoutPlan(planId)
        setMessage('')
        try {
          await uploadBillingStudentId(studentIdFile)
          setStudentIdReady(true)
        } catch (err) {
          setMessage(err instanceof Error ? err.message : t('studentIdUploadFailed'))
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
          setSubscription({
            status: sub.status,
            plan: sub.plan,
            startedAt: sub.startedAt,
            expiresAt: sub.expiresAt,
          })
          setSearchParams({}, { replace: true })
          return
        }

        if ('iframeUrl' in result && result.iframeUrl) {
          navigate(`${localizePath('/odeme/paytr')}?token=${encodeURIComponent(result.token)}`)
          return
        }

        if ('paymentPageUrl' in result && result.paymentPageUrl) {
          window.location.href = result.paymentPageUrl
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : t('checkoutFailed'))
      } finally {
        setCheckoutPlan(null)
      }
    },
    [user, plans, studentIdReady, studentIdFile, provider, navigate, setSearchParams, refreshUser, localizePath, t],
  )

  useEffect(() => {
    if (loading || !user || !autoCheckout || !planParam || autoCheckoutStarted.current) return
    if (subscription?.status === 'active' && subscription.plan === planParam) return
    autoCheckoutStarted.current = true
    void handleCheckout(planParam)
  }, [loading, user, autoCheckout, planParam, subscription?.status, subscription?.plan, handleCheckout])

  const handleRedeemGiftCode = async () => {
    if (!user) {
      navigate(localizePath('/giris'))
      return
    }
    setRedeemingGift(true)
    setMessage('')
    try {
      const result = await redeemGiftCode(giftCode)
      setGiftCode('')
      setMessage(
        locale === 'en'
          ? `Gift code applied. Access until ${new Date(result.expiresAt).toLocaleDateString('en-US')}.`
          : `Hediye kodu uygulandı. Erişim ${new Date(result.expiresAt).toLocaleDateString('tr-TR')} tarihine kadar.`,
      )
      await refreshUser()
      const sub = await fetchSubscription()
      setSubscription({
        status: sub.status,
        plan: sub.plan,
        startedAt: sub.startedAt,
        expiresAt: sub.expiresAt,
      })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('giftRedeemFailed'))
    } finally {
      setRedeemingGift(false)
    }
  }

  const planButtonLabel = (action: PlanAction, checkingOut: boolean) => {
    if (checkingOut) return t('redirecting')
    if (!providers.paymentReady) return t('paymentSoon')
    if (action === 'current') return t('currentPlan')
    if (action === 'switch') return t('switchPlan')
    if (action === 'renew') return t('renewPlan')
    return t('payWithCard')
  }

  return (
    <div className="min-h-dvh bg-plooy-bg">
      <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <PlooyLogo tone="on-dark" linked linkTo={localizePath('/')} className="h-8" />
          <Link to={localizePath(user ? '/hesap' : '/giris')} className="text-sm text-plooy-gold hover:underline">
            {user ? t('accountLink') : t('loginLink')}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-plooy-gold">{t('eyebrow')}</p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{t('title')}</h1>
          <p className="mt-2 text-sm text-plooy-muted">{t('subtitle')}</p>
          {(subscription?.status === 'active' || subscription?.status === 'cancelled' || subscription?.status === 'expired') && (
            <div className="mt-3 space-y-1 text-sm text-emerald-300">
              <p>
                {subscription.status === 'active'
                  ? t('activeSubscription')
                  : subscription.status === 'cancelled'
                    ? t('cancelledSubscription')
                    : t('expiredSubscription')}
              </p>
              {currentPlanName && (
                <p className="text-white/90">
                  {t('currentPlanLabel')}: <span className="font-medium">{currentPlanName}</span>
                </p>
              )}
              {subscription.startedAt && (
                <p className="text-plooy-muted">
                  {t('startedAt')} {new Date(subscription.startedAt).toLocaleDateString(dateLocale)}
                </p>
              )}
              {subscription.expiresAt && (
                <p className="text-plooy-muted">
                  {t('expiresAt')} {new Date(subscription.expiresAt).toLocaleDateString(dateLocale)}
                </p>
              )}
            </div>
          )}
          {subscription?.status === 'active' && subscription.plan && (
            <p className="mx-auto mt-4 max-w-lg text-xs text-plooy-muted">{t('planChangeNote')}</p>
          )}
        </div>

        {!providers.paymentReady && (
          <p className="mt-3 text-center text-sm text-amber-200/90">{t('paymentPending')}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {plans.map((plan) => {
              const action = resolvePlanAction(plan.id, subscription, Boolean(user))
              const isCurrent = action === 'current'
              return (
              <article
                key={plan.id}
                className={`rounded-2xl border p-8 ${
                  isCurrent
                    ? 'border-emerald-400/40 bg-emerald-500/5'
                    : plan.popular
                      ? 'border-plooy-gold/40 bg-plooy-gold/5'
                      : 'border-white/10 bg-[#11141c]'
                }`}
              >
                {isCurrent && (
                  <span className="mb-3 inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                    {t('currentPlanBadge')}
                  </span>
                )}
                {!isCurrent && plan.popular && (
                  <span className="mb-3 inline-block rounded-full bg-plooy-gold px-3 py-1 text-xs font-semibold text-plooy-bg">
                    {t('studentBadge')}
                  </span>
                )}
                {plan.campaignLabel && (
                  <span className="mb-3 ml-2 inline-block rounded-full border border-plooy-gold/40 px-3 py-1 text-xs font-semibold text-plooy-gold">
                    {plan.campaignLabel}
                  </span>
                )}
                <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                <p className="mt-2 text-4xl font-bold text-white">
                  ₺{plan.price}
                  <span className="text-sm font-normal text-plooy-muted">
                    {plan.interval === 'once' ? '' : ' '}
                    {planPriceSuffix(plan.interval)}
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-white/80">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>

                {plan.requiresStudentId && user && !studentIdReady && !isCurrent && (
                  <label className="mt-6 block">
                    <span className="mb-1.5 block text-sm font-medium text-white/90">{t('studentId')}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(event) => setStudentIdFile(event.target.files?.[0] ?? null)}
                      className="w-full rounded-lg border border-white/10 bg-plooy-bg px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-plooy-gold file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-plooy-bg"
                    />
                  </label>
                )}

                {plan.requiresStudentId && studentIdReady && !isCurrent && (
                  <p className="mt-6 text-xs text-emerald-300">{t('studentIdUploaded')}</p>
                )}

                <button
                  type="button"
                  disabled={isCurrent || checkoutPlan === plan.id || !providers.paymentReady}
                  onClick={() => void handleCheckout(plan.id)}
                  className="mt-8 w-full rounded-lg bg-plooy-gold py-3.5 text-sm font-semibold text-plooy-bg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {planButtonLabel(action, checkoutPlan === plan.id)}
                </button>
              </article>
              )
            })}
          </div>
        )}

        <section className="mt-10 rounded-2xl border border-white/10 bg-[#11141c] p-6">
          <h2 className="text-lg font-semibold text-white">{t('giftTitle')}</h2>
          <p className="mt-1 text-sm text-plooy-muted">{t('giftSubtitle')}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={giftCode}
              onChange={(event) => setGiftCode(event.target.value.toUpperCase())}
              placeholder={t('giftPlaceholder')}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-plooy-bg px-3 py-2.5 font-mono text-sm uppercase text-white outline-none focus:border-plooy-gold"
            />
            <button
              type="button"
              disabled={!giftCode.trim() || redeemingGift}
              onClick={() => void handleRedeemGiftCode()}
              className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60"
            >
              {redeemingGift ? t('giftRedeeming') : t('giftRedeem')}
            </button>
          </div>
          {!user && (
            <p className="mt-3 text-xs text-plooy-muted">{t('giftLoginHint')}</p>
          )}
        </section>

        {!user && (
          <p className="mt-8 text-center text-sm text-plooy-muted">
            {t('noAccount')}{' '}
            <Link to={localizePath('/kayit')} className="font-medium text-plooy-gold hover:underline">
              {t('signupLink')}
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
