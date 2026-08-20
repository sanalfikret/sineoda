import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  type AdminUser,
  updateAdminUser,
} from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { fuzzySearchMatch, sortByTurkishTitle } from '../../utils/search'

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

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
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

  const viewerCount = useMemo(() => users.filter((user) => user.role !== 'creator').length, [users])

  const filteredUsers = useMemo(() => {
    const viewers = users.filter((user) => user.role !== 'creator')
    const searched = viewers.filter((user) =>
      fuzzySearchMatch(query, user.name, user.email, subscriptionLabel(user)),
    )
    return sortByTurkishTitle(searched, (user) => user.name)
  }, [users, query])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await createAdminUser(form)
      setForm({ name: '', email: '', password: '', role: 'user' })
      setShowForm(false)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı oluşturulamadı.')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" kullanıcısını silmek istediğine emin misin?`)) return
    try {
      await deleteAdminUser(id)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme başarısız.')
    }
  }

  const handleRoleChange = async (id: string, role: 'user' | 'admin') => {
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
            Alfabetik sıralı · {filteredUsers.length} kayıtlı izleyici / admin
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((open) => !open)}
          className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg"
        >
          + Yeni Kullanıcı
        </button>
      </div>

      <AdminSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Ad, e-posta veya abonelik ara..."
        resultCount={filteredUsers.length}
        totalCount={viewerCount}
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#11141c] p-5"
        >
          <h2 className="font-semibold text-white">Yeni kullanıcı</h2>
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
                setForm({ ...form, role: event.target.value as 'user' | 'admin' })
              }
              className="rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold"
            >
              <option value="user">Kullanıcı</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-sineoda-gold px-5 py-2.5 text-sm font-semibold text-sineoda-bg"
          >
            Oluştur
          </button>
        </form>
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
                  <th className="px-4 py-3 font-medium">Abonelik</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Profiller</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sineoda-muted">
                      Aramanızla eşleşen kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                      <td className="px-4 py-3 text-white/80">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${subscriptionClass(user)}`}>
                          {subscriptionLabel(user)}
                        </span>
                        {user.subscription?.expiresAt && user.subscription.status === 'active' && (
                          <p className="mt-1 text-[11px] text-sineoda-muted">
                            Bitiş: {new Date(user.subscription.expiresAt).toLocaleDateString('tr-TR')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(event) =>
                            void handleRoleChange(user.id, event.target.value as 'user' | 'admin')
                          }
                          className="rounded-lg border border-white/10 bg-[#0d0f14] px-2 py-1 text-xs text-white"
                        >
                          <option value="user">Kullanıcı</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-white/70">{user.profiles.length}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void handleDelete(user.id, user.name)}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
