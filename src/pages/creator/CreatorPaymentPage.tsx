import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchBillingPlans, startCheckout, type BillingPlan } from '../../api/client'
import { CreatorAuthLayout } from '../../components/creator/CreatorAuthLayout'
import { useAuth } from '../../context/AuthContext'
import { BRAND_NAME } from '../../constants/brand'
import { useLocale } from '../../i18n/LocaleContext'

function getCreatorRegistrationPlanId(program?: 'standard' | 'student_cinema') {
  return program === 'student_cinema' ? 'student_cinema_application' : 'creator_application'
}

export function CreatorPaymentPage() {
  const { t } = useTranslation('creator', { keyPrefix: 'payment' })
  const { localizePath } = useLocale()
  const { user, isCreator, isLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [provider] = useState<'paytr' | 'iyzico'>('paytr')
  const [paymentReady, setPaymentReady] = useState(false)
  const [plan, setPlan] = useState<BillingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [message, setMessage] = useState('')
  const autoCheckoutStarted = useRef(false)
  const autoCheckout = searchParams.get('checkout') === '1'

  const program = user?.creator?.program ?? 'standard'
  const planId = getCreatorRegistrationPlanId(program)
  const isStudentProgram = program === 'student_cinema'
  const registrationPaid = Boolean(user?.creator?.registrationPaidAt)

  useEffect(() => {
    fetchBillingPlans()
      .then((billing) => {
        setPaymentReady(billing.providers.paymentReady)
        const match = billing.plans.find((entry) => entry.id === planId) ?? null
        setPlan(match)
      })
      .finally(() => setLoading(false))
  }, [planId])

  const handleCheckout = useCallback(async () => {
    if (!plan) return
    setPaying(true)
    setMessage('')
    try {
      const result = await startCheckout(plan.id, provider)

      if ('demoMode' in result && result.demoMode) {
        setMessage(result.message)
        await refreshUser()
        setSearchParams({}, { replace: true })
        navigate(localizePath('/creator'), { replace: true })
        return
      }

      if ('iframeUrl' in result && result.iframeUrl) {
        navigate(`${localizePath('/odeme/paytr')}?token=${encodeURIComponent(result.token)}&return=creator`)
        return
      }

      if ('paymentPageUrl' in result && result.paymentPageUrl) {
        window.location.href = result.paymentPageUrl
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('checkoutFailed'))
    } finally {
      setPaying(false)
    }
  }, [plan, provider, navigate, refreshUser, setSearchParams, localizePath, t])

  useEffect(() => {
    if (loading || !user || !isCreator || registrationPaid || !autoCheckout || autoCheckoutStarted.current || !plan) {
      return
    }
    autoCheckoutStarted.current = true
    void handleCheckout()
  }, [loading, user, isCreator, registrationPaid, autoCheckout, handleCheckout, plan])

  if (!isLoading && !isCreator) {
    return null
  }

  if (!isLoading && registrationPaid) {
    navigate(localizePath('/creator'), { replace: true })
    return null
  }

  const price = plan?.price ?? (isStudentProgram ? 49 : 69)

  return (
    <CreatorAuthLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-[#11141c] p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-white">
            {plan?.name ?? (isStudentProgram ? t('titleStudent') : t('titleStandard'))}
          </h1>
          <p className="mt-2 text-sm text-plooy-muted">
            {isStudentProgram
              ? t('subtitleStudent', { brand: BRAND_NAME })
              : t('subtitleStandard')}
          </p>

          <div className="mt-6 rounded-xl border border-plooy-gold/30 bg-plooy-gold/5 p-5">
            <p className="text-sm text-plooy-muted">{t('feeLabel')}</p>
            <p className="mt-1 text-3xl font-bold text-plooy-gold">₺{price}</p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {(plan?.features ?? []).map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>

          {message && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </div>
          )}

          {!paymentReady && (
            <p className="mt-4 text-sm text-amber-200/90">{t('paymentNotReady')}</p>
          )}

          <button
            type="button"
            disabled={paying || loading || !plan || !paymentReady}
            onClick={() => void handleCheckout()}
            className="mt-6 w-full rounded-lg bg-plooy-gold py-3 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {paying
              ? t('redirecting')
              : paymentReady
                ? t('payAndContinue', { price })
                : t('paymentSoon')}
          </button>

          <p className="mt-4 text-center text-sm text-plooy-muted">
            <Link to={localizePath('/creator')} className="text-plooy-gold hover:underline">
              {t('backToPanel')}
            </Link>
          </p>
        </div>
      </div>
    </CreatorAuthLayout>
  )
}
