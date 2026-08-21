import { useState, type FormEvent } from 'react'
import {
  giftAdminUserSubscription,
  sendAdminUserMessage,
  type AdminUser,
} from '../../api/client'

function subscriptionLabel(user: AdminUser) {
  const status = user.subscription?.status ?? 'free'
  const plan = user.subscription?.plan
  if (status === 'active') {
    return plan === 'yearly' ? 'Yıllık aktif' : plan === 'monthly' ? 'Aylık aktif' : 'Aktif'
  }
  if (status === 'expired') return 'Süresi dolmuş'
  return 'Ücretsiz'
}

function roleLabel(role: AdminUser['role']) {
  if (role === 'admin') return 'Admin'
  if (role === 'manager') return 'Yönetici'
  return 'Üye'
}

interface AdminUserDetailPanelProps {
  user: AdminUser
  onClose: () => void
  onUpdated: () => Promise<void>
}

export function AdminUserDetailPanel({ user, onClose, onUpdated }: AdminUserDetailPanelProps) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [gifting, setGifting] = useState(false)
  const [sending, setSending] = useState(false)
  const [messageForm, setMessageForm] = useState({ subject: '', body: '' })

  const handleGift = async (months: number) => {
    setError('')
    setSuccess('')
    setGifting(true)
    try {
      const { gift } = await giftAdminUserSubscription(user.id, months)
      setSuccess(
        `${months} ay hediye verildi. Yeni bitiş: ${new Date(gift.expiresAt).toLocaleDateString('tr-TR')}`,
      )
      await onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hediye verilemedi.')
    } finally {
      setGifting(false)
    }
  }

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSending(true)
    try {
      await sendAdminUserMessage(user.id, messageForm)
      setSuccess('Mesaj gönderildi.')
      setMessageForm({ subject: '', body: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesaj gönderilemedi.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#11141c] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">{user.name}</h2>
            <p className="text-sm text-sineoda-muted">{roleLabel(user.role)} · {subscriptionLabel(user)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {success}
            </div>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Hesap bilgileri</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-sineoda-muted">E-posta</dt>
                <dd className="text-white">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sineoda-muted">Telefon</dt>
                <dd className="text-white">{user.phone?.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="text-sineoda-muted">Kayıt tarihi</dt>
                <dd className="text-white">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sineoda-muted">Üyelik</dt>
                <dd className="text-white">
                  {subscriptionLabel(user)}
                  {user.subscription?.expiresAt && user.subscription.status === 'active' && (
                    <span className="text-sineoda-muted">
                      {' '}
                      · Bitiş: {new Date(user.subscription.expiresAt).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Profiller ({user.profiles.length})</h3>
            {user.profiles.length === 0 ? (
              <p className="text-sm text-sineoda-muted">Profil yok.</p>
            ) : (
              <ul className="space-y-2">
                {user.profiles.map((profile) => (
                  <li
                    key={profile.id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2"
                  >
                    <span className="text-xl">{profile.avatar}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{profile.name}</p>
                      {profile.isKids && <p className="text-xs text-sineoda-muted">Çocuk profili</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {user.role === 'user' && (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Hediye abonelik</h3>
                <p className="text-xs text-sineoda-muted">
                  Mevcut abonelik varsa süre uzatılır; yoksa yeni dönem başlatılır.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((months) => (
                    <button
                      key={months}
                      type="button"
                      disabled={gifting}
                      onClick={() => void handleGift(months)}
                      className="rounded-lg border border-sineoda-gold/40 bg-sineoda-gold/10 px-4 py-2 text-sm font-medium text-sineoda-gold hover:bg-sineoda-gold/20 disabled:opacity-50"
                    >
                      +{months} ay
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Mesaj gönder</h3>
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <input
                    required
                    value={messageForm.subject}
                    onChange={(event) => setMessageForm({ ...messageForm, subject: event.target.value })}
                    placeholder="Konu"
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
                  />
                  <textarea
                    required
                    rows={4}
                    value={messageForm.body}
                    onChange={(event) => setMessageForm({ ...messageForm, body: event.target.value })}
                    placeholder="Mesaj metni..."
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg disabled:opacity-50"
                  >
                    {sending ? 'Gönderiliyor...' : 'Mesaj gönder'}
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
