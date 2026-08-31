import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchBillingPlans, fetchBillingInvoices, fetchLegalConsents, fetchSubscription, cancelSubscription, type BillingInvoice, type LegalConsentRecord } from '../api/client'
import { PageFooter } from '../components/PageFooter'
import { PageMeta } from '../components/PageMeta'
import { InstallAppStatusCard } from '../components/InstallAppButton'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { ProfileAvatarPicker } from '../components/ProfileAvatarPicker'
import { ProfileWatchStatsPanel } from '../components/ProfileWatchStatsPanel'
import { useAuth } from '../context/AuthContext'
import { CONSENT_TYPE_LABELS, LEGAL_LINKS, LEGAL_VERSION, legalPageHref } from '../constants/legal'
import { PROFILE_AVATARS, type Profile } from '../types/auth'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatMoneyTl(value: number) {
  return `${value.toLocaleString('tr-TR')} TL`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  })
}

function subscriptionStatusLabel(status: string) {
  if (status === 'active') return 'Aktif'
  if (status === 'expired') return 'Süresi doldu'
  if (status === 'cancelled') return 'İptal edildi'
  return 'Ücretsiz'
}

export function AccountPage() {
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
      setMessage('Hesap bilgileri güncellendi.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Kayıt başarısız.')
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
      setMessage('Profil güncellendi.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Profil güncellenemedi.')
    }
  }

  const handleDeleteProfile = async (profileId: string) => {
    if (!window.confirm('Bu profili silmek istediğine emin misin?')) return
    setMessage('')
    try {
      await deleteProfile(profileId)
      if (editingProfileId === profileId) setEditingProfileId(null)
      setMessage('Profil silindi.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Profil silinemedi.')
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
      setMessage('Profil eklendi.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Profil eklenemedi.')
    }
  }

  const handleCancelSubscription = async () => {
    if (
      !window.confirm(
        'Aboneliğinizi iptal etmek istediğinize emin misiniz? Ödediğiniz dönem sonuna kadar izlemeye devam edebilirsiniz; otomatik yenileme yapılmaz.',
      )
    ) {
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
      setMessage('Abonelik iptal edildi. Bitiş tarihine kadar izlemeye devam edebilirsiniz.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Abonelik iptal edilemedi.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-dvh bg-plooy-bg px-4 py-8 text-white sm:px-6">
      <PageMeta title="Hesabım" noIndex />
      <div className="safe-top mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Hesabım</h1>
            <p className="mt-1 text-sm text-plooy-muted">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                clearActiveProfile()
                navigate('/profiller')
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Profil Değiştir
            </button>
            <Link to="/" className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              Ana Sayfa
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
          <h2 className="text-lg font-semibold">Hesap Bilgileri</h2>
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-plooy-muted">Ad Soyad</span>
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
            {savingAccount ? 'Kaydediliyor…' : 'Hesabı Kaydet'}
          </button>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">Abonelik</h2>
            <Link to="/planlar" className="text-sm text-plooy-gold hover:underline">
              Planları Gör
            </Link>
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-plooy-muted">Durum</dt>
              <dd className="mt-1 font-medium">
                {subscription ? subscriptionStatusLabel(subscription.status) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-plooy-muted">Plan</dt>
              <dd className="mt-1 font-medium">{planName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-plooy-muted">Başlangıç</dt>
              <dd className="mt-1 font-medium">{formatDate(subscription?.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-plooy-muted">Bitiş</dt>
              <dd className="mt-1 font-medium">{formatDate(subscription?.expiresAt)}</dd>
            </div>
            {subscription?.cancelledAt && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-plooy-muted">İptal tarihi</dt>
                <dd className="mt-1 font-medium">{formatDate(subscription.cancelledAt)}</dd>
              </div>
            )}
          </dl>

          {subscription?.status === 'cancelled' && subscription.expiresAt && (
            <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Aboneliğiniz iptal edildi. {formatDate(subscription.expiresAt)} tarihine kadar izlemeye devam
              edebilirsiniz.
            </p>
          )}

          {subscription?.canCancel && (
            <button
              type="button"
              disabled={cancelling}
              onClick={() => void handleCancelSubscription()}
              className="mt-4 rounded-lg border border-red-400/40 px-4 py-2.5 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-60"
            >
              {cancelling ? 'İptal ediliyor…' : 'Aboneliği İptal Et'}
            </button>
          )}

          {activeProfile && (
            <div className="mt-4 flex items-center gap-3 text-sm text-plooy-muted">
              <span>Aktif profil:</span>
              <ProfileAvatar avatar={activeProfile.avatar} name={activeProfile.name} className="h-8 w-8" emojiClassName="text-lg" />
              <span className="text-white">{activeProfile.name}</span>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <h2 className="text-lg font-semibold">Ödeme geçmişi</h2>
          <p className="mt-1 text-sm text-plooy-muted">
            PayTR ile yapılan ödemeler için platform makbuzu. Resmi e-fatura ayrı muhasebe sürecinde düzenlenir.
          </p>

          {invoices.length === 0 ? (
            <p className="mt-4 text-sm text-plooy-muted">Henüz kayıtlı ödeme bulunmuyor.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-plooy-muted">
                    <th className="px-2 py-2 font-medium">Tarih</th>
                    <th className="px-2 py-2 font-medium">Plan</th>
                    <th className="px-2 py-2 font-medium">Tutar</th>
                    <th className="px-2 py-2 font-medium">Referans</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-white/5">
                      <td className="px-2 py-3 whitespace-nowrap">{formatDateTime(invoice.paidAt)}</td>
                      <td className="px-2 py-3">{invoice.planName}</td>
                      <td className="px-2 py-3 whitespace-nowrap">{formatMoneyTl(invoice.amountTl)}</td>
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
            <h2 className="text-lg font-semibold">İzleme İstatistikleri</h2>
            <p className="mt-1 text-sm text-plooy-muted">
              Aktif profilin için film, dizi ve diğer içeriklerde geçirdiğin süre.
            </p>
            <div className="mt-4">
              <ProfileWatchStatsPanel profileId={activeProfile.id} profileName={activeProfile.name} />
            </div>
          </section>
        )}

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <h2 className="text-lg font-semibold">Yasal Bilgiler</h2>
          <p className="mt-1 text-sm text-plooy-muted">
            Platform kullanımına ilişkin metinler. Güncel sürüm: {LEGAL_VERSION}.
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.slug} to={legalPageHref(link.slug, '/hesap')} className="text-plooy-gold hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>

          {legalConsents.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-sm font-semibold text-white">Onay kayıtlarım</h3>
              <p className="mt-1 text-xs text-plooy-muted">
                Kayıt ve çerez tercihlerinizde adınız, IP adresiniz ve zaman damgası saklanır.
              </p>
              <ul className="mt-4 space-y-3">
                {legalConsents.map((consent) => (
                  <li key={consent.id} className="rounded-xl border border-white/10 bg-[#0d0f14] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {CONSENT_TYPE_LABELS[consent.consentType]}
                        </p>
                        <p className="mt-1 text-xs text-plooy-muted">
                          {new Date(consent.acceptedAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                          {' · IP: '}
                          {consent.ipAddress}
                          {' · Sürüm: '}
                          {consent.documentVersion}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedConsentId((current) => (current === consent.id ? null : consent.id))
                        }
                        className="text-xs text-plooy-gold hover:underline"
                      >
                        {expandedConsentId === consent.id ? 'Gizle' : 'Metni gör'}
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
            <h2 className="text-lg font-semibold">Profiller</h2>
            {user.profiles.length < 4 && (
              <button
                type="button"
                onClick={() => setShowAddForm((open) => !open)}
                className="rounded-lg border border-plooy-gold/40 px-3 py-1.5 text-sm text-plooy-gold"
              >
                + Profil Ekle
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
                      Çocuk profili
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveProfile()}
                        className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProfileId(null)}
                        className="rounded-lg px-4 py-2 text-sm text-plooy-muted hover:text-white"
                      >
                        İptal
                      </button>
                      {user.profiles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteProfile(profile.id)}
                          className="rounded-lg px-4 py-2 text-sm text-red-300 hover:text-red-200"
                        >
                          Sil
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
                          {profile.isKids ? 'Çocuk profili' : 'Standart profil'}
                          {activeProfile?.id === profile.id ? ' · Şu an aktif' : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditProfile(profile)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
                    >
                      Düzenle
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAddForm && (
            <div className="mt-4 rounded-xl border border-plooy-gold/20 bg-plooy-gold/5 p-4">
              <h3 className="font-medium">Yeni profil</h3>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Profil adı"
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
                Çocuk profili
              </label>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleAddProfile()}
                  className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg"
                >
                  Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg px-4 py-2 text-sm text-plooy-muted"
                >
                  İptal
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
