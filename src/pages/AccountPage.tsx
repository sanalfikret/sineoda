import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchBillingPlans, fetchSubscription } from '../api/client'
import { PageFooter } from '../components/PageFooter'
import { InstallAppStatusCard } from '../components/InstallAppButton'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { ProfileAvatarPicker } from '../components/ProfileAvatarPicker'
import { ProfileWatchStatsPanel } from '../components/ProfileWatchStatsPanel'
import { useAuth } from '../context/AuthContext'
import { PROFILE_AVATARS, type Profile } from '../types/auth'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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

  return (
    <div className="min-h-dvh bg-sineoda-bg px-4 py-8 text-white sm:px-6">
      <div className="safe-top mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Hesabım</h1>
            <p className="mt-1 text-sm text-sineoda-muted">{user.email}</p>
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
            <span className="text-xs font-medium uppercase tracking-wide text-sineoda-muted">Ad Soyad</span>
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 outline-none focus:border-sineoda-gold"
            />
          </label>
          <button
            type="button"
            disabled={savingAccount}
            onClick={() => void handleSaveAccount()}
            className="mt-4 rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
          >
            {savingAccount ? 'Kaydediliyor…' : 'Hesabı Kaydet'}
          </button>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">Abonelik</h2>
            <Link to="/planlar" className="text-sm text-sineoda-gold hover:underline">
              Planları Gör
            </Link>
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-sineoda-muted">Durum</dt>
              <dd className="mt-1 font-medium">
                {subscription ? subscriptionStatusLabel(subscription.status) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-sineoda-muted">Plan</dt>
              <dd className="mt-1 font-medium">{planName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-sineoda-muted">Başlangıç</dt>
              <dd className="mt-1 font-medium">{formatDate(subscription?.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-sineoda-muted">Bitiş</dt>
              <dd className="mt-1 font-medium">{formatDate(subscription?.expiresAt)}</dd>
            </div>
          </dl>

          {activeProfile && (
            <div className="mt-4 flex items-center gap-3 text-sm text-sineoda-muted">
              <span>Aktif profil:</span>
              <ProfileAvatar avatar={activeProfile.avatar} name={activeProfile.name} className="h-8 w-8" emojiClassName="text-lg" />
              <span className="text-white">{activeProfile.name}</span>
            </div>
          )}
        </section>

        {activeProfile && (
          <section className="mb-8 rounded-2xl border border-white/10 bg-[#11141c] p-5">
            <h2 className="text-lg font-semibold">İzleme İstatistikleri</h2>
            <p className="mt-1 text-sm text-sineoda-muted">
              Aktif profilin için film, dizi ve diğer içeriklerde geçirdiğin süre.
            </p>
            <div className="mt-4">
              <ProfileWatchStatsPanel profileId={activeProfile.id} profileName={activeProfile.name} />
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Profiller</h2>
            {user.profiles.length < 4 && (
              <button
                type="button"
                onClick={() => setShowAddForm((open) => !open)}
                className="rounded-lg border border-sineoda-gold/40 px-3 py-1.5 text-sm text-sineoda-gold"
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
                      className="w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-2.5 outline-none focus:border-sineoda-gold"
                    />
                    <ProfileAvatarPicker value={editAvatar} onChange={setEditAvatar} name={editName} />
                    <label className="flex items-center gap-2 text-sm text-white/85">
                      <input
                        type="checkbox"
                        checked={editKids}
                        onChange={(event) => setEditKids(event.target.checked)}
                        className="accent-sineoda-gold"
                      />
                      Çocuk profili
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveProfile()}
                        className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProfileId(null)}
                        className="rounded-lg px-4 py-2 text-sm text-sineoda-muted hover:text-white"
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
                        <p className="text-sm text-sineoda-muted">
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
            <div className="mt-4 rounded-xl border border-sineoda-gold/20 bg-sineoda-gold/5 p-4">
              <h3 className="font-medium">Yeni profil</h3>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Profil adı"
                className="mt-3 w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-2.5 outline-none focus:border-sineoda-gold"
              />
              <ProfileAvatarPicker value={newAvatar} onChange={setNewAvatar} name={newName} />
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newKids}
                  onChange={(event) => setNewKids(event.target.checked)}
                  className="accent-sineoda-gold"
                />
                Çocuk profili
              </label>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleAddProfile()}
                  className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg"
                >
                  Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg px-4 py-2 text-sm text-sineoda-muted"
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
