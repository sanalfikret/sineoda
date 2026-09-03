import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sendSmsCode, uploadStudentId } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { LegalDocumentModal } from '../components/LegalDocumentModal'
import { type LegalSlug } from '../constants/legal'
import { useAuth } from '../context/AuthContext'
import { useLegalDocuments } from '../hooks/useLegalDocuments'
import { useLocale } from '../i18n/LocaleContext'
import { useLocalizedLegalDocuments } from '../i18n/useLegalLocale'
import { postLoginPath } from '../utils/billing'

function LegalReadButton({
  slug,
  label,
  onOpen,
}: {
  slug: LegalSlug
  label: string
  onOpen: (slug: LegalSlug) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(slug)}
      className="text-plooy-gold underline underline-offset-2 hover:text-plooy-gold/80"
    >
      {label}
    </button>
  )
}

type SignupPlanId = 'standard' | 'student'

export function SignupPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const { localizePath } = useLocale()
  const { signup, user } = useAuth()
  const { documents: baseDocuments } = useLegalDocuments()
  const { documents, links: legalLinks } = useLocalizedLegalDocuments(baseDocuments)
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
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptKvkk, setAcceptKvkk] = useState(false)
  const [legalModalSlug, setLegalModalSlug] = useState<LegalSlug | null>(null)

  const legalAccepted = acceptTerms && acceptPrivacy && acceptKvkk

  const signupPlans: {
    id: SignupPlanId
    name: string
    price: number
    note: string
    requiresStudentId?: boolean
  }[] = [
    {
      id: 'standard',
      name: t('standardPlan'),
      price: 69,
      note: t('standardPlanNote'),
    },
    {
      id: 'student',
      name: t('studentPlan'),
      price: 49,
      note: t('studentPlanNote'),
      requiresStudentId: true,
    },
  ]

  const planLabel = (planId: SignupPlanId) =>
    planId === 'student' ? t('planStudent') : t('planStandard')

  if (user) {
    return <Navigate to={localizePath(postLoginPath(user))} replace />
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
      setError(err instanceof Error ? err.message : t('smsSendFailed'))
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!codeSent) {
      setError(t('sendCodeFirst'))
      return
    }

    if (selectedPlan === 'student' && !studentIdFile) {
      setError(t('studentIdRequiredSignup'))
      return
    }

    if (!acceptTerms || !acceptPrivacy || !acceptKvkk) {
      setError(t('legalRequiredSignup'))
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
        acceptTerms,
        acceptPrivacy,
        acceptKvkk,
      })
      setPendingEmail(result.email)
      setPendingPlan((result.planId as SignupPlanId) ?? selectedPlan)
      setDevVerifyUrl(result.devVerifyUrl ?? null)
      setCompleted(true)
      setInfo(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signupFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title={completed ? t('signupTitleCompleted') : t('signupTitle')}
      subtitle={completed ? t('signupSubtitleCompleted') : t('signupSubtitle')}
      backTo={localizePath('/giris')}
    >
      {completed ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {info || t('verificationSentDefault')}
            {pendingEmail ? (
              <p className="mt-2 text-white/85">
                {t('sentToAddress')} <strong>{pendingEmail}</strong>
              </p>
            ) : null}
            <p className="mt-2 text-white/85">
              {t('selectedPlan')} <strong>{planLabel(pendingPlan)}</strong>
            </p>
            {devVerifyUrl ? (
              <p className="mt-2 break-all text-xs text-white/70">
                {t('devModeLink')}{' '}
                <a href={devVerifyUrl} className="text-plooy-gold underline">
                  {devVerifyUrl}
                </a>
              </p>
            ) : null}
          </div>
          <p className="text-sm text-plooy-muted">{t('afterVerifyPaymentNote')}</p>
          <Link
            to={`${localizePath('/eposta-dogrula')}?email=${encodeURIComponent(pendingEmail || email)}`}
            className="block w-full rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 py-3 text-center text-sm font-semibold text-plooy-gold"
          >
            {t('resendVerification')}
          </Link>
          <Link
            to={localizePath('/giris')}
            className="block w-full rounded-lg bg-plooy-gold py-3 text-center text-sm font-semibold text-plooy-bg"
          >
            {t('loginAndPay')}
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
                  {t('devModeCode')} <strong>{devCode}</strong>
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-white/90">{t('subscriptionPlan')}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {signupPlans.map((plan) => {
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
                      <span className="text-xs font-normal text-plooy-muted">{t('perMonth')}</span>
                    </p>
                    <p className="mt-1 text-xs text-plooy-muted">{plan.note}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedPlan === 'student' && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/90">{t('studentId')}</span>
              <input
                type="file"
                required
                accept="image/*,application/pdf"
                onChange={(event) => setStudentIdFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-white/10 bg-plooy-bg px-3 py-2.5 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-plooy-gold file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-plooy-bg"
              />
              <p className="mt-1 text-xs text-plooy-muted">{t('studentIdFileHint')}</p>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/90">{t('fullName')}</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
              placeholder={t('namePlaceholder')}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/90">{t('email')}</span>
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
            <span className="mb-1.5 block text-sm font-medium text-white/90">{t('phone')}</span>
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
                placeholder={t('phonePlaceholder')}
              />
              <button
                type="button"
                disabled={sendingCode || !phone.trim()}
                onClick={() => void handleSendCode()}
                className="shrink-0 rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 px-3 py-3 text-xs font-semibold text-plooy-gold disabled:opacity-50 sm:text-sm"
              >
                {sendingCode ? '...' : t('sendCode')}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/90">{t('smsVerificationCode')}</span>
            <input
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={smsCode}
              onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
              placeholder={t('smsCodePlaceholder')}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/90">{t('password')}</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-3 text-white outline-none transition focus:border-plooy-gold"
              placeholder={t('passwordPlaceholder')}
            />
          </label>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-plooy-muted">
            <p className="font-medium text-white/90">{t('legalApprovalsTitle')}</p>
            <p className="text-[11px] text-plooy-muted/90">{t('legalApprovalsHint')}</p>
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                required
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-plooy-gold"
              />
              <span>
                <LegalReadButton slug="kullanim-kosullari" label={tCommon('footer.terms')} onOpen={setLegalModalSlug} />
                {t('acceptTermsSuffix')}
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                required
                checked={acceptPrivacy}
                onChange={(event) => setAcceptPrivacy(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-plooy-gold"
              />
              <span>
                <LegalReadButton slug="gizlilik-politikasi" label={tCommon('footer.privacy')} onOpen={setLegalModalSlug} />
                {t('acceptTermsSuffix')}
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                required
                checked={acceptKvkk}
                onChange={(event) => setAcceptKvkk(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-plooy-gold"
              />
              <span>
                <LegalReadButton slug="kvkk-aydinlatma" label={tCommon('footer.kvkk')} onOpen={setLegalModalSlug} />
                {' '}{t('acceptKvkkAnd')}{' '}
                <LegalReadButton slug="acik-riza-metni" label={tCommon('footer.consent')} onOpen={setLegalModalSlug} />
                {t('acceptKvkkRead')} {t('acceptKvkkPrefix')}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !legalAccepted}
            className="w-full rounded-lg bg-plooy-gold py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? t('creatingAccount') : t('signupSubmit')}
          </button>
        </form>
      )}

      {!completed ? (
        <>
          <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-plooy-muted">
            {legalLinks.map((link) => (
              <button
                key={link.slug}
                type="button"
                onClick={() => setLegalModalSlug(link.slug)}
                className="hover:text-white"
              >
                {link.label}
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-plooy-muted">
            {t('hasAccount')}{' '}
            <Link to={localizePath('/giris')} className="font-medium text-plooy-gold hover:underline">
              {t('loginLink')}
            </Link>
          </p>
        </>
      ) : null}

      {legalModalSlug && (
        <LegalDocumentModal
          slug={legalModalSlug}
          document={documents[legalModalSlug]}
          open
          onClose={() => setLegalModalSlug(null)}
          closeLabel={t('backToSignup')}
        />
      )}
    </AuthLayout>
  )
}
