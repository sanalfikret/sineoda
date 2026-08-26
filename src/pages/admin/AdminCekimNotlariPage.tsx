import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  deleteAdminCekimNotlariItem,
  fetchAdminCekimNotlari,
  type CekimNotlariSection,
} from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { CEKIM_NOTLARI_NAV_LABEL, CEKIM_NOTLARI_SECTION_TITLE } from '../../constants/cekimNotlari'
import { fuzzySearchMatch } from '../../utils/search'

export function AdminCekimNotlariPage() {
  const navigate = useNavigate()
  const [sections, setSections] = useState<CekimNotlariSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminCekimNotlari()
      setSections(data.sections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredSections = useMemo(() => {
    if (!query.trim()) return sections
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          fuzzySearchMatch(query, item.title, item.description, section.title),
        ),
      }))
      .filter((section) => fuzzySearchMatch(query, section.title) || section.items.length > 0)
  }, [sections, query])

  const totalVideos = sections.reduce((count, section) => count + section.items.length, 0)

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" videosunu silmek istediğine emin misin?`)) return
    setDeletingId(id)
    try {
      await deleteAdminCekimNotlariItem(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sineoda-accent">
            {CEKIM_NOTLARI_SECTION_TITLE}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">{CEKIM_NOTLARI_NAV_LABEL}</h1>
          <p className="mt-2 text-sm text-sineoda-muted">
            {totalVideos} video · 14 alt kategori · başlık, uzman, video ve kategori yönetimi
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/cekim-notlari/yeni')}
          className="rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
        >
          + Yeni Video
        </button>
      </div>

      <AdminSearchBar value={query} onChange={setQuery} placeholder="Kategori veya video ara..." />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : (
        <div className="space-y-8">
          {filteredSections.map((section) => (
            <section key={section.id} className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                <Link
                  to={`/admin/cekim-notlari/yeni?kategori=${encodeURIComponent(section.id)}`}
                  className="text-sm font-medium text-sineoda-gold hover:underline"
                >
                  + Bu kategoriye video ekle
                </Link>
              </div>

              {section.items.length === 0 ? (
                <p className="text-sm text-sineoda-muted">Henüz video yok.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-sineoda-muted">
                      <tr>
                        <th className="pb-3 pr-4">Başlık</th>
                        <th className="pb-3 pr-4">Uzman</th>
                        <th className="pb-3 pr-4">Süre</th>
                        <th className="pb-3 pr-4">Durum</th>
                        <th className="pb-3">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {section.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 pr-4 font-medium text-white">{item.title}</td>
                          <td className="py-3 pr-4 text-sineoda-muted">
                            {item.credits?.directors?.[0] ?? '—'}
                          </td>
                          <td className="py-3 pr-4 text-sineoda-muted">{item.duration}</td>
                          <td className="py-3 pr-4 text-sineoda-muted">
                            {item.publishedAt ? 'Yayında' : 'Taslak'}
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/cekim-notlari/${item.id}`)}
                                className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/80 hover:bg-white/5"
                              >
                                Düzenle
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === item.id}
                                onClick={() => void handleDelete(item.id, item.title)}
                                className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                              >
                                Sil
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
