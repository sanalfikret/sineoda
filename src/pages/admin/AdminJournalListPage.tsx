import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteJournalPost, fetchAdminJournalPosts } from '../../api/client'
import { formatJournalDate } from '../../utils/journal'
import type { JournalPost } from '../../types/journal'

export function AdminJournalListPage() {
  const [posts, setPosts] = useState<JournalPost[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchAdminJournalPosts()
      setPosts(data.posts)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleDelete = async (post: JournalPost) => {
    if (!window.confirm(`"${post.title}" yazısını silmek istediğine emin misin?`)) return
    try {
      await deleteJournalPost(post.id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme başarısız.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dergi</h1>
          <p className="mt-1 text-sm text-sineoda-muted">
            Bağımsız sinema yazıları · {posts.length} yazı
          </p>
        </div>
        <Link
          to="/admin/dergi/yeni"
          className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg"
        >
          + Yeni Yazı
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-sineoda-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Başlık</th>
              <th className="px-4 py-3 font-medium">Yazar</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sineoda-muted">
                  Yükleniyor...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sineoda-muted">
                  Henüz yazı yok.{' '}
                  <Link to="/admin/dergi/yeni" className="text-sineoda-gold hover:underline">
                    İlk yazıyı ekle
                  </Link>
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{post.title}</p>
                    <p className="text-xs text-sineoda-muted">/dergi/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-white/80">{post.author}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        post.status === 'published'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {post.status === 'published' ? 'Yayında' : 'Taslak'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/70">
                    {formatJournalDate(post.publishedAt ?? post.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {post.status === 'published' && (
                        <a
                          href={`/dergi/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                        >
                          Görüntüle
                        </a>
                      )}
                      <Link
                        to={`/admin/dergi/${post.id}`}
                        className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                      >
                        Düzenle
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(post)}
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
    </div>
  )
}
