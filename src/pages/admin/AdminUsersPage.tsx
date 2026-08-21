import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  broadcastAdminMessage,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUser,
} from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { AdminUserDetailPanel } from '../../components/admin/AdminUserDetailPanel'
import { fuzzySearchMatch, sortByTurkishTitle } from '../../utils/search'

type TabId = 'members' | 'staff'

function subscriptionLabel(user: AdminUser) {
  const status = user.subscription?.status ?? 'free'
  const plan = user.subscription?.plan
  if (status === 'active') {
    return plan === 'yearly' ? 'Yıllık aktif' : plan === 'monthly' ? 'Aylık aktif' : 'Aktif'
  }
  if (status === 'expired') return 'Süresi dolmuş'
  return 'Ücretsiz'
}

function subscriptionClass(user: AdminUser) {
  const status = user.subscription?.status ?? 'free'
  if (status === 'active') return 'bg-emerald-500/15 text-emerald-300'
  if (status === 'expired') return 'bg-red-500/15 text-red-300'
  return 'bg-white/10 text-white/70'
}

function roleLabel(role: AdminUser['role']) {
  if (role === 'admin') return 'Admin'
  if (role === 'manager') return 'Yönetici'
  return 'Üye'
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<TabId>('members')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager' as 'admin' | 'manager',
  })
  const [broadcastForm, setBroadcastForm] = useState({
    subject: '',
    body: '',
    audience: 'all' as 'all' | 'active_subscribers',
  })

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { users: data } = await fetchAdminUsers()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcılar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const members = useMemo(() => users.filter((user) => user.role === 'user'), [users])
  const staff = useMemo(
    () => users.filter((user) => user.role === 'admin' || user.role === 'manager'),
    [users],
  )

  const listUsers = tab === 'members' ? members : staff

  const filteredUsers = useMemo(() => {
    const searched = listUsers.filter((user) =>
      fuzzySearchMatch(
        query,
        user.name,
        user.email,
        user.phone ?? '',
        subscriptionLabel(user),
        roleLabel(user.role),
      ),
    )
    return sortByTurkishTitle(searched, (user) => user.name)
  }, [listUsers, query])

  const handleCreateStaff = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await createAdminUser(form)
      setForm({ name: '', email: '', password: '', role: 'manager' })
      setShowForm(false)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı oluşturulamadı.')
    }
  }

  const handleBroadcast = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setBroadcasting(true)
    try {
      const result = await broadcastAdminMessage(broadcastForm)
      setSuccess(`${result.sent} izleyiciye mesaj gönderildi.`)
      setBroadcastForm({ subject: '', body: '', audience: 'all' })
      setShowBroadcast(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu mesaj gönderilemedi.')
    } finally {
      setBroadcasting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" kullanıcısını silmek istediğine emin misin?`)) return
    try {
      await deleteAdminUser(id)
      if (selectedUser?.id === id) setSelectedUser(null)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme başarısız.')
    }
  }

  const handleRoleChange = async (id: string, role: 'admin' | 'manager') => {
    try {
      await updateAdminUser(id, { role })
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncelleme başarısız.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">İzleyiciler</h1>
          <p className="mt-1 text-sm text-sineoda-muted">
            {members.length} üye · {staff.length} yönetici
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'members' && (
            <button
              type="button"
              onClick={() => setShowBroadcast(true)}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
            >
              Toplu mesaj
            </button>
          )}
          {tab === 'staff' && (
            <button
              type="button"
              onClick={() => setShowForm((open) => !open)}
              className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg"
            >
              + Yönetici ekle
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('members')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === 'members' ? 'bg-sineoda-gold/15 text-sineoda-gold' : 'bg-white/5 text-white/70'
          }`}
        >
          Üyeler
        </button>
        <button
          type="button"
          onClick={() => setTab('staff')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === 'staff' ? 'bg-sineoda-gold/15 text-sineoda-gold' : 'bg-white/5 text-white/70'
          }`}
        >
          Yöneticiler
        </button>
      </div>

      <AdminSearchBar
        value={query}
        onChange={setQuery}
        placeholder={tab === 'members' ? 'Ad, e-posta, telefon veya abonelik ara...' : 'Ad, e-posta ara...'}
        resultCount={filteredUsers.length}
        totalCount={listUsers.length}
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {showForm && tab === 'staff' && (
        <form onSubmit={handleCreateStaff} className="space-y-4 rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <h2 className="font-semibold text-white">Yeni yönetici</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ad Soyad"
              className="rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="E-posta"
              className="rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold"
            />
            <input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Şifre (min 6)"
              className="rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold"
            />
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as 'admin' | 'manager' })
              }
              className="rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold"
            >
              <option value="manager">Yönetici</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-sineoda-gold px-5 py-2.5 text-sm font-semibold text-sineoda-bg">
            Oluştur
          </button>
        </form>
      )}

      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowBroadcast(false)}>
          <form
            onSubmit={handleBroadcast}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-[#11141c] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">Toplu mesaj gönder</h2>
            <select
              value={broadcastForm.audience}
              onChange={(event) =>
                setBroadcastForm({
                  ...broadcastForm,
                  audience: event.target.value as 'all' | 'active_subscribers',
                })
              }
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
            >
              <option value="all">Tüm üyeler</option>
              <option value="active_subscribers">Aktif aboneler</option>
            </select>
            <input
              required
              value={broadcastForm.subject}
              onChange={(event) => setBroadcastForm({ ...broadcastForm, subject: event.target.value })}
              placeholder="Konu (ör. Yeni film eklendi)"
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
            />
            <textarea
              required
              rows={5}
              value={broadcastForm.body}
              onChange={(event) => setBroadcastForm({ ...broadcastForm, body: event.target.value })}
              placeholder="Mesaj metni..."
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBroadcast(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={broadcasting}
                className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg disabled:opacity-50"
              >
                {broadcasting ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]">
        {loading ? (
          <p className="p-6 text-sm text-sineoda-muted">Yükleniyor...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-sineoda-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Ad</th>
                  <th className="px-4 py-3 font-medium">E-posta</th>
                  {tab === 'members' && <th className="px-4 py-3 font-medium">Telefon</th>}
                  {tab === 'members' && <th className="px-4 py-3 font-medium">Abonelik</th>}
                  {tab === 'staff' && <th className="px-4 py-3 font-medium">Rol</th>}
                  <th className="px-4 py-3 font-medium">Profiller</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sineoda-muted">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                      <td className="px-4 py-3 text-white/80">{user.email}</td>
                      {tab === 'members' && (
                        <td className="px-4 py-3 text-white/70">{user.phone?.trim() || '—'}</td>
                      )}
                      {tab === 'members' && (
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${subscriptionClass(user)}`}>
                            {subscriptionLabel(user)}
                          </span>
                        </td>
                      )}
                      {tab === 'staff' && (
                        <td className="px-4 py-3">
                          <select
                            value={user.role === 'admin' ? 'admin' : 'manager'}
                            onChange={(event) =>
                              void handleRoleChange(user.id, event.target.value as 'admin' | 'manager')
                            }
                            className="rounded-lg border border-white/10 bg-[#0d0f14] px-2 py-1 text-xs text-white"
                          >
                            <option value="manager">Yönetici</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      )}
                      <td className="px-4 py-3 text-white/70">{user.profiles.length}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {tab === 'members' && (
                            <button
                              type="button"
                              onClick={() => setSelectedUser(user)}
                              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                            >
                              Detay
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDelete(user.id, user.name)}
                            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <AdminUserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={async () => {
            const { users: data } = await fetchAdminUsers()
            setUsers(data)
            const refreshed = data.find((entry) => entry.id === selectedUser.id)
            if (refreshed) setSelectedUser(refreshed)
          }}
        />
      )}
    </div>
  )
}
