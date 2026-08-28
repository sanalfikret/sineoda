import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchBillingPlans, startCheckout } from '../../api/client'
import { CreatorAuthLayout } from '../../components/creator/CreatorAuthLayout'
import { useAuth } from '../../context/AuthContext'

const CREATOR_PLAN_ID = 'creator_application'

export function CreatorPaymentPage() {
  const { user, isCreator, isLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [provider, setProvider] = useState<'paytr' | 'iyzico'>('paytr')
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [message, setMessage] = useState('')
  const autoCheckoutStarted = useRef(false)
  const autoCheckout = searchParams.get('checkout') === '1'

  const registrationPaid = Boolean(user?.creator?.registrationPaidAt)

  useEffect(() => {
    fetchBillingPlans()
      .then((billing) => setProvider(billing.providers.default))
      .finally(() => setLoading(false))
  }, [])

  const handleCheckout = useCallback(async () => {
    setPaying(true)
    setMessage('')
    try {
      const result = await startCheckout(CREATOR_PLAN_ID, provider)

      if ('demoMode' in result && result.demoMode) {
        setMessage(result.message)
        await refreshUser()
        setSearchParams({}, { replace: true })
        navigate('/creator', { replace: true })
        return
      }

      if ('iframeUrl' in result && result.iframeUrl) {
        navigate(`/odeme/paytr?token=${encodeURIComponent(result.token)}&return=creator`)
        return
      }

      if ('paymentPageUrl' in result && result.paymentPageUrl) {
        window.location.href = result.paymentPageUrl
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ödeme başlatılamadı.')
    } finally {
      setPaying(false)
    }
  }, [provider, navigate, refreshUser, setSearchParams])

  useEffect(() => {
    if (loading || !user || !isCreator || registrationPaid || !autoCheckout || autoCheckoutStarted.current) {
      return
    }
    autoCheckoutStarted.current = true
    void handleCheckout()
  }, [loading, user, isCreator, registrationPaid, autoCheckout, handleCheckout])

  if (!isLoading && !isCreator) {
    return null
  }

  if (!isLoading && registrationPaid) {
    navigate('/creator', { replace: true })
    return null
  }

  return (
    <CreatorAuthLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-[#11141c] p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-white">Yapımcı Başvuru Ücreti</h1>
          <p className="mt-2 text-sm text-sineoda-muted">
            Yapımcı üyeliğiniz otomatik açılır. Film başvurusu göndermek için tek seferlik başvuru
            ücretini ödeyin; filminizin yayına alınması admin incelemesine tabidir.
          </p>

          <div className="mt-6 rounded-xl border border-sineoda-gold/30 bg-sineoda-gold/5 p-5">
            <p className="text-sm text-sineoda-muted">Başvuru ücreti</p>
            <p className="mt-1 text-3xl font-bold text-sineoda-gold">₺69</p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li>Yapımcı paneli erişimi</li>
              <li>Film başvurusu gönderme</li>
              <li>Film onayı yalnızca Sineoda admin ekibi tarafından</li>
            </ul>
          </div>

          {message && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </div>
          )}

          <button
            type="button"
            disabled={paying || loading}
            onClick={() => void handleCheckout()}
            className="mt-6 w-full rounded-lg bg-sineoda-gold py-3 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
          >
            {paying ? 'Yönlendiriliyor...' : '₺69 Öde ve Başvuruya Devam Et'}
          </button>

          <p className="mt-4 text-center text-sm text-sineoda-muted">
            <Link to="/creator" className="text-sineoda-gold hover:underline">
              Panele dön
            </Link>
          </p>
        </div>
      </div>
    </CreatorAuthLayout>
  )
}
