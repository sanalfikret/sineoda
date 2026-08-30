import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createJournalPost,
  fetchAdminJournalPost,
  updateJournalPost,
} from '../../api/client'
import { ImageUpload } from '../../components/admin/ImageUpload'
import { useContent } from '../../context/ContentContext'
import type { JournalPostStatus } from '../../types/journal'
import { BRAND_EDITOR } from '../../constants/brand'

const EMPTY = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  coverImage: '',
  author: BRAND_EDITOR,
  contentId: '',
  status: 'draft' as JournalPostStatus,
}

export function AdminJournalFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'yeni'
  const navigate = useNavigate()
  const { catalog } = useContent()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    void fetchAdminJournalPost(id!)
      .then((data) => {
        const post = data.post
        setForm({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          body: post.body,
          coverImage: post.coverImage,
          author: post.author,
          contentId: post.contentId ?? '',
          status: post.status,
        })
      })
      .catch(() => setError('Yazı yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const update = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      ...form,
      contentId: form.contentId || null,
    }

    try {
      if (isNew) {
        const data = await createJournalPost(payload)
        navigate(`/admin/dergi/${data.post.id}`)
      } else {
        await updateJournalPost(id!, payload)
        navigate('/admin/dergi')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-plooy-muted">Yükleniyor...</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{isNew ? 'Yeni Yazı' : 'Yazıyı Düzenle'}</h1>
          <p className="mt-1 text-sm text-plooy-muted">Dergi / blog içeriği</p>
        </div>
        <Link to="/admin/dergi" className="text-sm text-plooy-gold hover:underline">
          ← Listeye dön
        </Link>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm text-white/85">Başlık</span>
          <input
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-plooy-gold"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-white/85">URL slug (boş bırakılırsa otomatik)</span>
          <input
            value={form.slug}
            onChange={(event) => update('slug', event.target.value)}
            placeholder="ornek-yazi-basligi"
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-plooy-gold"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-white/85">Özet</span>
          <textarea
            value={form.excerpt}
            onChange={(event) => update('excerpt', event.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-plooy-gold"
          />
        </label>

        <ImageUpload label="Kapak görseli" value={form.coverImage} onChange={(url) => update('coverImage', url)} />

        <label className="block space-y-2">
          <span className="text-sm text-white/85">Yazar</span>
          <input
            value={form.author}
            onChange={(event) => update('author', event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-plooy-gold"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-white/85">İlgili film/dizi (isteğe bağlı)</span>
          <select
            value={form.contentId}
            onChange={(event) => update('contentId', event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-plooy-gold"
          >
            <option value="">Bağlantı yok</option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-white/85">Durum</span>
          <select
            value={form.status}
            onChange={(event) => update('status', event.target.value as JournalPostStatus)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-plooy-gold"
          >
            <option value="draft">Taslak</option>
            <option value="published">Yayında</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-white/85">İçerik</span>
          <textarea
            value={form.body}
            onChange={(event) => update('body', event.target.value)}
            rows={14}
            placeholder="Paragraflar arasında boş satır bırakın."
            className="w-full resize-y rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 font-mono text-sm leading-relaxed text-white outline-none focus:border-plooy-gold"
          />
        </label>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-plooy-gold px-6 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : isNew ? 'Yayınla / Kaydet' : 'Güncelle'}
          </button>
          <Link
            to="/admin/dergi"
            className="rounded-lg border border-white/10 px-6 py-2.5 text-sm text-white/80 hover:bg-white/5"
          >
            İptal
          </Link>
        </div>
      </form>
    </div>
  )
}
