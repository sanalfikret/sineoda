import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  createAdminCekimNotlariItem,
  fetchAdminCekimNotlariItem,
  updateAdminCekimNotlariItem,
} from '../../api/client'
import { ImageUpload } from '../../components/admin/ImageUpload'
import { VideoUpload } from '../../components/admin/VideoUpload'
import { CEKIM_NOTLARI_CATEGORIES } from '../../constants/cekimNotlari'

const RATINGS = ['Genel', '7+', '13+', '16+', '18+']

const EMPTY_FORM = {
  title: '',
  description: '',
  expert: '',
  categoryId: CEKIM_NOTLARI_CATEGORIES[0].id,
  year: new Date().getFullYear(),
  duration: '10 dk',
  rating: '13+',
  poster: '',
  backdrop: '',
  videoUrl: '',
  publishNow: true,
}

export function AdminCekimNotlariFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'yeni'
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    categoryId: searchParams.get('kategori') ?? EMPTY_FORM.categoryId,
  })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    void fetchAdminCekimNotlariItem(id!)
      .then(({ item, categoryId }) => {
        setForm({
          title: item.title,
          description: item.description,
          expert: item.credits?.directors?.[0] ?? '',
          categoryId,
          year: item.year,
          duration: item.duration,
          rating: item.rating,
          poster: item.poster,
          backdrop: item.backdrop,
          videoUrl: item.videoUrl,
          publishNow: Boolean(item.publishedAt),
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Video yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const categoryOptions = useMemo(() => CEKIM_NOTLARI_CATEGORIES, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Başlık zorunlu.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        expert: form.expert.trim(),
        categoryId: form.categoryId,
        year: form.year,
        duration: form.duration.trim(),
        rating: form.rating,
        poster: form.poster,
        backdrop: form.backdrop || form.poster,
        videoUrl: form.videoUrl,
        publishNow: form.publishNow,
      }
      if (isNew) {
        await createAdminCekimNotlariItem(payload)
      } else {
        await updateAdminCekimNotlariItem(id!, payload)
      }
      navigate('/admin/cekim-notlari')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/admin/cekim-notlari" className="text-sm text-sineoda-gold hover:underline">
          ← Çekim Notları
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">
          {isNew ? 'Yeni Eğitim Videosu' : 'Videoyu Düzenle'}
        </h1>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white/80">Alt kategori</span>
          <select
            value={form.categoryId}
            onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-sineoda-surface px-3 py-2.5 text-white outline-none focus:border-sineoda-gold"
          >
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white/80">Başlık</span>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-sineoda-surface px-3 py-2.5 text-white outline-none focus:border-sineoda-gold"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white/80">Açıklama</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-sineoda-surface px-3 py-2.5 text-white outline-none focus:border-sineoda-gold"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white/80">Uzman / Eğitmen</span>
          <input
            value={form.expert}
            onChange={(event) => setForm((current) => ({ ...current, expert: event.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-sineoda-surface px-3 py-2.5 text-white outline-none focus:border-sineoda-gold"
            placeholder="Örn. Ayşe Kaya"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/80">Yıl</span>
            <input
              type="number"
              value={form.year}
              onChange={(event) => setForm((current) => ({ ...current, year: Number(event.target.value) }))}
              className="w-full rounded-lg border border-white/10 bg-sineoda-surface px-3 py-2.5 text-white outline-none focus:border-sineoda-gold"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/80">Süre</span>
            <input
              value={form.duration}
              onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-sineoda-surface px-3 py-2.5 text-white outline-none focus:border-sineoda-gold"
              placeholder="12 dk"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/80">Yaş</span>
            <select
              value={form.rating}
              onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-sineoda-surface px-3 py-2.5 text-white outline-none focus:border-sineoda-gold"
            >
              {RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ImageUpload
          label="Kapak görseli"
          value={form.poster}
          onChange={(poster) => setForm((current) => ({ ...current, poster }))}
        />
        <ImageUpload
          label="Arka plan görseli"
          value={form.backdrop}
          onChange={(backdrop) => setForm((current) => ({ ...current, backdrop }))}
        />
        <VideoUpload
          label="Eğitim videosu"
          value={form.videoUrl}
          onChange={(videoUrl) => setForm((current) => ({ ...current, videoUrl }))}
        />

        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={form.publishNow}
            onChange={(event) => setForm((current) => ({ ...current, publishNow: event.target.checked }))}
          />
          Hemen yayınla
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sineoda-gold px-5 py-2.5 text-sm font-semibold text-sineoda-bg transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <Link
            to="/admin/cekim-notlari"
            className="rounded-lg border border-white/10 px-5 py-2.5 text-sm text-white/80 hover:bg-white/5"
          >
            İptal
          </Link>
        </div>
      </form>
    </div>
  )
}
