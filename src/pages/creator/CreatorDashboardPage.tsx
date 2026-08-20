import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  creatorAddDocument,
  creatorDeleteDocument,
  creatorFetchDashboard,
  creatorFetchMe,
  creatorSubmitContent,
  creatorUploadDocument,
  creatorUploadImage,
  creatorUploadVideo,
} from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { CREATOR_DOC_TYPES } from '../../constants/creatorLegal'
import type { ContentItem } from '../../types/content'
import type { CreatorStatus } from '../../types/auth'

interface CreatorDocument {
  id: string
  docType: string
  fileUrl: string
  uploadedAt: string
}

interface DashboardContent extends ContentItem {
  reviewStatus: string
  qualifiedMinutes: number
  likes: number
  threshold: string
}

const STATUS_LABELS: Record<CreatorStatus, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  suspended: 'Askıya alındı',
}

const REVIEW_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'İncelemede',
  published: 'Yayında',
  rejected: 'Reddedildi',
}

export function CreatorDashboardPage() {
  const { user, logout } = useAuth()
  const [documents, setDocuments] = useState<CreatorDocument[]>([])
  const [content, setContent] = useState<DashboardContent[]>([])
  const [totals, setTotals] = useState({ qualifiedMinutes: 0, likes: 0, publishedCount: 0, pendingCount: 0 })
  const [status, setStatus] = useState<CreatorStatus>('pending')
  const [documentCount, setDocumentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [docType, setDocType] = useState('ownership')
  const [docUploading, setDocUploading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    year: new Date().getFullYear(),
    duration: '',
    rating: '13+',
    type: 'film' as ContentItem['type'],
    genres: '',
    videoUrl: '',
    poster: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [me, dashboard] = await Promise.all([creatorFetchMe(), creatorFetchDashboard()])
      setDocuments(me.documents)
      setContent(dashboard.content as DashboardContent[])
      setTotals(dashboard.totals)
      setStatus(dashboard.creator.status as CreatorStatus)
      setDocumentCount(dashboard.creator.documentCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDocumentUpload = async (file: File) => {
    setDocUploading(true)
    setError('')
    try {
      const url = await creatorUploadDocument(file)
      await creatorAddDocument(docType, url)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belge yüklenemedi.')
    } finally {
      setDocUploading(false)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    try {
      await creatorDeleteDocument(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belge silinemedi.')
    }
  }

  const handlePosterUpload = async (file: File) => {
    try {
      const url = await creatorUploadImage(file)
      setForm((prev) => ({ ...prev, poster: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Poster yüklenemedi.')
    }
  }

  const handleVideoUpload = async (file: File) => {
    try {
      const url = await creatorUploadVideo(file)
      setForm((prev) => ({ ...prev, videoUrl: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video yüklenemedi.')
    }
  }

  const handleSubmitContent = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const genres = form.genres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
      await creatorSubmitContent({
        title: form.title,
        description: form.description,
        year: form.year,
        duration: form.duration,
        rating: form.rating,
        type: form.type,
        genres,
        poster: form.poster,
        backdrop: form.poster,
        videoUrl: form.videoUrl,
      })
      setShowForm(false)
      setForm({
        title: '',
        description: '',
        year: new Date().getFullYear(),
        duration: '',
        rating: '13+',
        type: 'film',
        genres: '',
        videoUrl: '',
        poster: '',
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İçerik gönderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  const studioName = user?.creator?.studioName ?? 'Yapımcı'

  return (
    <div className="min-h-dvh bg-[#0d0f14] text-white">
      <header className="border-b border-white/10 bg-[#11141c] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg" />
            <div>
              <p className="text-lg font-bold">{studioName}</p>
              <p className="text-xs text-sineoda-muted">Sineoda Creator · {STATUS_LABELS[status]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-sineoda-muted hover:text-white">
              Ana site
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-sineoda-muted hover:text-white"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {status === 'pending' && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            Hesabınız inceleniyor. Telif belgelerinizi yükleyebilirsiniz; onaylandıktan sonra içerik
            gönderebilirsiniz.
          </div>
        )}

        {status === 'rejected' && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
            Hesabınız reddedildi. Detaylar için{' '}
            <Link to="/iletisim" className="underline">
              iletişime
            </Link>{' '}
            geçin.
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Nitelikli izlenme', value: `${totals.qualifiedMinutes} dk` },
            { label: 'Beğeni', value: String(totals.likes) },
            { label: 'Yayında', value: String(totals.publishedCount) },
            { label: 'İncelemede', value: String(totals.pendingCount) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-sineoda-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-sineoda-gold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-xl border border-white/10 bg-[#11141c] p-6">
          <h2 className="text-lg font-semibold">Gelir kuralları</h2>
          <p className="mt-2 text-sm text-sineoda-muted">
            Uzun metraj film, belgesel ve dizi bölümlerinde gelir hakkı yalnızca izleyici en az{' '}
            <strong className="text-white">%30</strong> izlediğinde başlar. Kısa filmlerde eşik{' '}
            <strong className="text-white">%50</strong>dir. Erken bırakan izleyiciler gelir hesabına dahil
            edilmez.
          </p>
        </section>

        <section className="mb-8 rounded-xl border border-white/10 bg-[#11141c] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Telif / mülkiyet belgeleri</h2>
              <p className="mt-1 text-sm text-sineoda-muted">
                İçeriğin size ait olduğunu kanıtlayan belgeler. Tüm yasal sorumluluk size aittir.
              </p>
            </div>
            <span className="text-sm text-sineoda-muted">{documentCount} belge</span>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-sineoda-muted">Belge türü</span>
              <select
                value={docType}
                onChange={(event) => setDocType(event.target.value)}
                className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
              >
                {CREATOR_DOC_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-sineoda-muted">PDF veya görsel</span>
              <input
                type="file"
                accept=".pdf,image/*"
                disabled={docUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleDocumentUpload(file)
                  event.target.value = ''
                }}
                className="text-sm text-sineoda-muted file:mr-3 file:rounded-lg file:border-0 file:bg-sineoda-gold file:px-3 file:py-2 file:text-sm file:font-medium file:text-sineoda-bg"
              />
            </label>
          </div>

          {documents.length > 0 && (
            <ul className="mt-4 space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#0d0f14] px-3 py-2 text-sm"
                >
                  <span>
                    {CREATOR_DOC_TYPES.find((t) => t.value === doc.docType)?.label ?? doc.docType} ·{' '}
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-sineoda-gold hover:underline">
                      Görüntüle
                    </a>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDocument(doc.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">İçeriklerim</h2>
            {status === 'approved' && documentCount > 0 && (
              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
                className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg"
              >
                {showForm ? 'Formu kapat' : '+ Yeni içerik gönder'}
              </button>
            )}
          </div>

          {showForm && status === 'approved' && (
            <form
              onSubmit={handleSubmitContent}
              className="mb-6 space-y-4 rounded-xl border border-sineoda-gold/20 bg-[#11141c] p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">Başlık</span>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">Açıklama</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Tür</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as ContentItem['type'] })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  >
                    <option value="film">Uzun metraj film</option>
                    <option value="belgesel">Belgesel</option>
                    <option value="kisa-film">Kısa film</option>
                    <option value="dizi">Dizi</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Yaş sınırı</span>
                  <select
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  >
                    {['Genel', '7+', '13+', '16+', '18+'].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Yıl</span>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Süre (ör. 1s 42dk)</span>
                  <input
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">Türler (virgülle)</span>
                  <input
                    value={form.genres}
                    onChange={(e) => setForm({ ...form, genres: e.target.value })}
                    placeholder="Drama, Bağımsız"
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Poster</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handlePosterUpload(file)
                    }}
                    className="text-sm text-sineoda-muted"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleVideoUpload(file)
                    }}
                    className="text-sm text-sineoda-muted"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">Video URL (veya yüklenen dosya)</span>
                  <input
                    required
                    value={form.videoUrl}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-sineoda-gold px-5 py-2.5 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
              >
                {submitting ? 'Gönderiliyor...' : 'İncelemeye gönder'}
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-sineoda-muted">Yükleniyor...</p>
          ) : content.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-sineoda-muted">
              Henüz içerik yok. Onaylı hesabınız ve en az bir belgeniz varsa yeni içerik gönderebilirsiniz.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#11141c] text-sineoda-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Başlık</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Eşik</th>
                    <th className="px-4 py-3 font-medium">Nitelikli dk</th>
                    <th className="px-4 py-3 font-medium">Beğeni</th>
                  </tr>
                </thead>
                <tbody>
                  {content.map((item) => (
                    <tr key={item.id} className="border-t border-white/5">
                      <td className="px-4 py-3">{item.title}</td>
                      <td className="px-4 py-3">{REVIEW_LABELS[item.reviewStatus] ?? item.reviewStatus}</td>
                      <td className="px-4 py-3">{item.threshold}</td>
                      <td className="px-4 py-3">{item.qualifiedMinutes}</td>
                      <td className="px-4 py-3">{item.likes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
