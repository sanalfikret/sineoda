import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchBillingPlans, fetchBillingInvoices, fetchLegalConsents, fetchSubscription, cancelSubscription, changePasswordRequest, type BillingInvoice, type LegalConsentRecord } from '../api/client'
import { DailyWatchQuotaCard } from '../components/member/DailyWatchQuotaCard'
import { PageFooter } from '../components/PageFooter'
import { PageMeta } from '../components/PageMeta'
import { InstallAppStatusCard } from '../components/InstallAppButton'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { ProfileAvatarPicker } from '../components/ProfileAvatarPicker'
import { ProfileWatchStatsPanel } from '../components/ProfileWatchStatsPanel'
import { useAuth } from '../context/AuthContext'
import { LEGAL_LINKS, LEGAL_VERSION, legalPageHref, type LegalSlug } from '../constants/legal'
import { PROFILE_AVATARS, type Profile } from '../types/auth'
import { useLocale } from '../i18n/LocaleContext'
import type { Locale } from '../i18n/paths'

const FOOTER_LEGAL_KEYS: Record<LegalSlug, string> = {
  'kullanim-kosullari': 'footer.terms',
  'gizlilik-politikasi': 'footer.privacy',
  'kvkk-aydinlatma': 'footer.kvkk',
  'acik-riza-metni': 'footer.consent',
  'cerez-politikasi': 'footer.cookies',
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatMoneyTl(value: number, locale: Locale) {
  const formatted = value.toLocaleString(locale === 'en' ? 'en-US' : 'tr-TR')
  return locale === 'en' ? `₺${formatted}` : `${formatted} TL`
}

function formatDateTime(value: string | null | undefined, locale: Locale) {
  if (!value) return '—'
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  })
}

export function AccountPage() {
  const { t } = useTranslation('account')
  const { t: tc } = useTranslation()
  const { locale, localizePath } = useLocale()
  const navigate = useNavigate()
  const {
    user,
    activeProfile,
    updateAccount,
    updateProfile,
    deleteProfile,
    addProfile,
    clearActiveProfile,
  } = useAuth()

  const [accountName, setAccountName] = useState(user?.name ?? '')
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof fetchSubscription>> | null>(null)
  const [planName, setPlanName] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState<string>(PROFILE_AVATARS[0])
  const [editKids, setEditKids] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAvatar, setNewAvatar] = useState<string>(PROFILE_AVATARS[0])
  const [newKids, setNewKids] = useState(false)
  const [legalConsents, setLegalConsents] = useState<LegalConsentRecord[]>([])
  const [expandedConsentId, setExpandedConsentId] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [cancelling, setCancelling] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (!user) return
    setAccountName(user.name)
  }, [user])

  useEffect(() => {
    void (async () => {
      try {
        const [sub, plans] = await Promise.all([fetchSubscription(), fetchBillingPlans()])
        setSubscription(sub)
        const plan = plans.plans.find((entry) => entry.id === sub.plan)
        setPlanName(plan?.name ?? sub.plan)
      } catch {
        setSubscription(null)
      }
    })()
  }, [user])

  useEffect(() => {
    if (!user) return
    void fetchBillingInvoices()
      .then(({ invoices: rows }) => setInvoices(rows))
      .catch(() => setInvoices([]))
  }, [user])

  useEffect(() => {
    if (!user) return
    void fetchLegalConsents()
      .then(({ consents }) => setLegalConsents(consents))
      .catch(() => setLegalConsents([]))
  }, [user])

  if (!user) return null

  const startEditProfile = (profile: Profile) => {
    setEditingProfileId(profile.id)
    setEditName(profile.name)
    setEditAvatar(profile.avatar)
    setEditKids(Boolean(profile.isKids))
    setMessage('')
  }

  const handleSaveAccount = async () => {
    if (!accountName.trim()) return
    setSavingAccount(true)
    setMessage('')
    try {
      await updateAccount(accountName.trim())
      setMessage(t('messages.accountUpdated'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('messages.saveFailed'))
    } finally {
      setSavingAccount(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!editingProfileId || !editName.trim()) return
    setMessage('')
    try {
      await updateProfile(editingProfileId, {
        name: editName.trim(),
        avatar: editAvatar,
        isKids: editKids,
      })
      setEditingProfileId(null)
      setMessage(t('messages.profileUpdated'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('messages.profileUpdateFailed'))
    }
  }

  const handleDeleteProfile = async (profileId: string) => {
    if (!window.confirm(t('profile.deleteConfirm'))) return
    setMessage('')
    try {
      await deleteProfile(profileId)
      if (editingProfileId === profileId) setEditingProfileId(null)
      setMessage(t('messages.profileDeleted'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('messages.profileDeleteFailed'))
    }
  }

  const handleAddProfile = async () => {
    if (!newName.trim()) return
    setMessage('')
    try {
      await addProfile(newName.trim(), newAvatar, newKids)
      setNewName('')
      setNewAvatar(PROFILE_AVATARS[0])
      setNewKids(false)
      setShowAddForm(false)
      setMessage(t('messages.profileAdded'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('messages.profileAddFailed'))
    }
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm(t('subscription.cancelConfirm'))) {
      return
    }
    setCancelling(true)
    setMessage('')
    try {
      const result = await cancelSubscription()
      setSubscription((current) =>
        current
          ? {
              ...current,
              status: result.status,
              cancelledAt: result.cancelledAt,
              expiresAt: result.expiresAt,
              canCancel: false,
            }
          : current,
      )
      setMessage(t('subscription.cancelSuccess'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('messages.cancelFailed'))
    } finally {
      setCancelling(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setMessage(t('password.tooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage(t('password.mismatch'))
      return
    }
    setSavingPassword(true)
    setMessage('')
    try {
      await changePasswordRequest(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage(t('password.success'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('password.failed'))
    } finally {
      setSavingPassword(false)
    }
  }

  const subscriptionStatusLabel = (status: string) => {
    const key = ['active', 'expired', 'cancelled'].includes(status) ? status : 'free'
    return t(`status.${key}`)
  }

  return (
    <div className="min-h-dvh bg-plooy-bg px-4 py-8 text-white sm:px-6">
      <PageMeta title={t('title')} description={t('metaDescription')} noIndex />
      <div className="safe-top mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
            <p className="mt-1 text-sm text-plooy-muted">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                clearActiveProfile()
                navigate(localizePath('/profiller'))
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              {tc('nav.switchProfile')}
            </button>
            <Link to={localizePath('/')} className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              {t('home')}
            </Link>
          </div>
        </div>

        {message && (
          <p className="mb-6 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">{message}</p>
        )}

        <div className="mb-8">
          <InstallAppStatusCard />
        </div>

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <h2 className="text-lg font-semibold">{t('sections.accountInfo')}</h2>
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-plooy-muted">{t('fields.name')}</span>
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 outline-none focus:border-plooy-gold"
            />
          </label>
          <button
            type="button"
            disabled={savingAccount}
            onClick={() => void handleSaveAccount()}
            className="mt-4 rounded-lg bg-plooy-gold px-4 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {savingAccount ? t('actions.saving') : t('actions.saveAccount')}
          </button>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('dailyQuota.title')}</h2>
            <Link to={localizePath('/izleme-gecmisi')} className="text-sm text-plooy-gold hover:underline">
              {t('dailyQuota.viewHistory')}
            </Link>
          </div>
          <div className="mt-4">
            <DailyWatchQuotaCard />
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('sections.subscription')}</h2>
            <Link to={localizePath('/planlar')} className="text-sm text-plooy-gold hover:underline">
              {t('subscription.viewPlans')}
            </Link>
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-plooy-muted">{t('fields.status')}</dt>
              <dd className="mt-1 font-medium">
                {subscription ? subscriptionStatusLabel(subscription.status) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-plooy-muted">{t('fields.plan')}</dt>
              <dd className="mt-1 font-medium">{planName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-plooy-muted">{t('fields.startedAt')}</dt>
              <dd className="mt-1 font-medium">{formatDate(subscription?.startedAt, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-plooy-muted">{t('fields.expiresAt')}</dt>
              <dd className="mt-1 font-medium">{formatDate(subscription?.expiresAt, locale)}</dd>
            </div>
            {subscription?.cancelledAt && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-plooy-muted">{t('fields.cancelledAt')}</dt>
                <dd className="mt-1 font-medium">{formatDate(subscription.cancelledAt, locale)}</dd>
              </div>
            )}
          </dl>

          {subscription?.status === 'cancelled' && subscription.expiresAt && (
            <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {t('subscription.cancelledNotice', { date: formatDate(subscription.expiresAt, locale) })}
            </p>
          )}

          {subscription?.canCancel && (
            <button
              type="button"
              disabled={cancelling}
              onClick={() => void handleCancelSubscription()}
              className="mt-4 rounded-lg border border-red-400/40 px-4 py-2.5 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-60"
            >
              {cancelling ? t('subscription.cancelling') : t('subscription.cancel')}
            </button>
          )}

          {activeProfile && (
            <div className="mt-4 flex items-center gap-3 text-sm text-plooy-muted">
              <span>{t('fields.activeProfile')}</span>
              <ProfileAvatar avatar={activeProfile.avatar} name={activeProfile.name} className="h-8 w-8" emojiClassName="text-lg" />
              <span className="text-white">{activeProfile.name}</span>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <h2 className="text-lg font-semibold">{t('password.title')}</h2>
          <p className="mt-1 text-sm text-plooy-muted">{t('password.hint')}</p>
          <div className="mt-4 space-y-3">
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-plooy-muted">{t('password.current')}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 outline-none focus:border-plooy-gold"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-plooy-muted">{t('password.new')}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 outline-none focus:border-plooy-gold"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-plooy-muted">{t('password.confirm')}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 outline-none focus:border-plooy-gold"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={savingPassword || !currentPassword || !newPassword}
            onClick={() => void handleChangePassword()}
            className="mt-4 rounded-lg bg-plooy-gold px-4 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {savingPassword ? t('password.saving') : t('password.submit')}
          </button>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <h2 className="text-lg font-semibold">{t('sections.paymentHistory')}</h2>
          <p className="mt-1 text-sm text-plooy-muted">{t('paymentHistory.description')}</p>

          {invoices.length === 0 ? (
            <p className="mt-4 text-sm text-plooy-muted">{t('paymentHistory.empty')}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-plooy-muted">
                    <th className="px-2 py-2 font-medium">{t('fields.date')}</th>
                    <th className="px-2 py-2 font-medium">{t('fields.plan')}</th>
                    <th className="px-2 py-2 font-medium">{t('fields.amount')}</th>
                    <th className="px-2 py-2 font-medium">{t('fields.reference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-white/5">
                      <td className="px-2 py-3 whitespace-nowrap">{formatDateTime(invoice.paidAt, locale)}</td>
                      <td className="px-2 py-3">{invoice.planName}</td>
                      <td className="px-2 py-3 whitespace-nowrap">{formatMoneyTl(invoice.amountTl, locale)}</td>
                      <td className="px-2 py-3 font-mono text-xs text-plooy-muted">{invoice.merchantOid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {activeProfile && (
          <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
            <h2 className="text-lg font-semibold">{t('sections.watchStats')}</h2>
            <p className="mt-1 text-sm text-plooy-muted">{t('watchStats.description')}</p>
            <div className="mt-4">
              <ProfileWatchStatsPanel profileId={activeProfile.id} profileName={activeProfile.name} />
            </div>
          </section>
        )}

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <h2 className="text-lg font-semibold">{t('sections.legal')}</h2>
          <p className="mt-1 text-sm text-plooy-muted">{t('legal.versionNote', { version: LEGAL_VERSION })}</p>
          <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.slug}
                to={localizePath(legalPageHref(link.slug, '/hesap'))}
                className="text-plooy-gold hover:underline"
              >
                {tc(FOOTER_LEGAL_KEYS[link.slug])}
              </Link>
            ))}
          </nav>

          {legalConsents.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-sm font-semibold text-white">{t('legal.consentRecords')}</h3>
              <p className="mt-1 text-xs text-plooy-muted">{t('legal.consentDescription')}</p>
              <ul className="mt-4 space-y-3">
                {legalConsents.map((consent) => (
                  <li key={consent.id} className="rounded-xl border border-white/10 bg-[#0d0f14] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {t(`consentTypes.${consent.consentType}`)}
                        </p>
                        <p className="mt-1 text-xs text-plooy-muted">
                          {t('legal.consentMeta', {
                            date: new Date(consent.acceptedAt).toLocaleString(locale === 'en' ? 'en-US' : 'tr-TR', {
                              timeZone: 'Europe/Istanbul',
                            }),
                            ip: consent.ipAddress,
                            version: consent.documentVersion,
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedConsentId((current) => (current === consent.id ? null : consent.id))
                        }
                        className="text-xs text-plooy-gold hover:underline"
                      >
                        {expandedConsentId === consent.id ? t('legal.hideText') : t('legal.showText')}
                      </button>
                    </div>
                    {expandedConsentId === consent.id && (
                      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs leading-relaxed text-white/75">
                        {consent.consentText}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('sections.profiles')}</h2>
            {user.profiles.length < 4 && (
              <button
                type="button"
                onClick={() => setShowAddForm((open) => !open)}
                className="rounded-lg border border-plooy-gold/40 px-3 py-1.5 text-sm text-plooy-gold"
              >
                {t('profile.add')}
              </button>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {user.profiles.map((profile) => (
              <div key={profile.id} className="rounded-xl border border-white/10 bg-[#0d0f14] p-4">
                {editingProfileId === profile.id ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-2.5 outline-none focus:border-plooy-gold"
                    />
                    <ProfileAvatarPicker value={editAvatar} onChange={setEditAvatar} name={editName} />
                    <label className="flex items-center gap-2 text-sm text-white/85">
                      <input
                        type="checkbox"
                        checked={editKids}
                        onChange={(event) => setEditKids(event.target.checked)}
                        className="accent-plooy-gold"
                      />
                      {t('profile.kidsProfile')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveProfile()}
                        className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg"
                      >
                        {tc('actions.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProfileId(null)}
                        className="rounded-lg px-4 py-2 text-sm text-plooy-muted hover:text-white"
                      >
                        {tc('actions.cancel')}
                      </button>
                      {user.profiles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteProfile(profile.id)}
                          className="rounded-lg px-4 py-2 text-sm text-red-300 hover:text-red-200"
                        >
                          {tc('actions.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ProfileAvatar avatar={profile.avatar} name={profile.name} className="h-12 w-12" emojiClassName="text-2xl" />
                      <div>
                        <p className="text-lg">{profile.name}</p>
                        <p className="text-sm text-plooy-muted">
                          {profile.isKids ? t('profile.kidsProfile') : t('profile.standardProfile')}
                          {activeProfile?.id === profile.id ? t('profile.currentlyActive') : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditProfile(profile)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
                    >
                      {t('profile.edit')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAddForm && (
            <div className="mt-4 rounded-xl border border-plooy-gold/20 bg-plooy-gold/5 p-4">
              <h3 className="font-medium">{t('profile.new')}</h3>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={t('profile.namePlaceholder')}
                className="mt-3 w-full rounded-lg border border-white/10 bg-plooy-bg px-4 py-2.5 outline-none focus:border-plooy-gold"
              />
              <ProfileAvatarPicker value={newAvatar} onChange={setNewAvatar} name={newName} />
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newKids}
                  onChange={(event) => setNewKids(event.target.checked)}
                  className="accent-plooy-gold"
                />
                {t('profile.kidsProfile')}
              </label>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleAddProfile()}
                  className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg"
                >
                  {tc('actions.add')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg px-4 py-2 text-sm text-plooy-muted"
                >
                  {tc('actions.cancel')}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <PageFooter />
    </div>
  )
}
