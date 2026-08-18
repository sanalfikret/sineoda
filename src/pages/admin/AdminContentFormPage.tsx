import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ImageUpload } from '../../components/admin/ImageUpload'
import { VideoUpload } from '../../components/admin/VideoUpload'
import { AdminEpisodesPanel } from '../../components/admin/AdminEpisodesPanel'
import { resolveMediaUrl } from '../../api/client'
import { useContent } from '../../context/ContentContext'
import { BROWSE_GENRES, CONTENT_GENRES, STREAM_PROVIDERS } from '../../constants/genres'
import type { ContentType } from '../../types/content'

const RATINGS = ['Genel', '7+', '13+', '16+', '18+']
const EMPTY_FORM = {
  title: '',
  description: '',
  year: new Date().getFullYear(),
  duration: '',
  rating: '13+',
  type: 'film' as ContentType,
  genres: '',
  poster: '',
  backdrop: '',
  videoUrl: '',
  trailerUrl: '',
  streamProvider: 'custom',
  videoFormat: 'standard' as 'standard' | 'vertical',
  isNew: false,
  featured: false,
}

export function AdminContentFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { getContentById, addContent, updateContent } = useContent()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    const item = getContentById(id)
    if (!item) return

    setForm({
      title: item.title,
      description: item.description,
      year: item.year,
      duration: item.duration,
      rating: item.rating,
      type: item.type,
      genres: item.genres.join(', '),
      poster: item.poster,
      backdrop: item.backdrop,
      videoUrl: item.videoUrl,
      trailerUrl: item.trailerUrl ?? '',
      streamProvider: item.streamProvider ?? 'custom',
      videoFormat: item.videoFormat ?? 'standard',
      isNew: item.isNew ?? false,
      featured: item.featured ?? false,
    })
  }, [id, getContentById])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!form.title.trim() || !form.poster.trim() || !form.videoUrl.trim()) {
      setError('Başlık, poster ve video zorunludur.')
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      year: form.year,
      duration: form.duration.trim(),
      rating: form.rating,
      type: form.type,
      genres: form.genres
        .split(',')
        .map((genre) => genre.trim())
        .filter(Boolean),
      poster: form.poster.trim(),
      backdrop: form.backdrop.trim() || form.poster.trim(),
      videoUrl: form.videoUrl.trim(),
      trailerUrl: form.trailerUrl.trim() || form.videoUrl.trim(),
      streamProvider: form.streamProvider,
      videoFormat: form.videoFormat,
      isNew: form.isNew,
      featured: form.featured,
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await updateContent(id, payload)
      } else {
        await addContent(payload)
      }
      navigate('/admin/icerikler')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/admin/icerikler" className="text-sm text-sineoda-muted hover:text-white">
          ← İçeriklere dön
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {isEdit ? 'İçeriği Düzenle' : 'Yeni İçerik'}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Başlık *">
            <input
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Tür">
            <select
              value={form.type}
              onChange={(event) => update('type', event.target.value as ContentType)}
              className={inputClass}
            >
              <option value="film">Film</option>
              <option value="dizi">Dizi</option>
            </select>
          </Field>
        </div>

        <Field label="Açıklama">
          <textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            rows={4}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Yıl">
            <input
              type="number"
              value={form.year}
              onChange={(event) => update('year', Number(event.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Süre">
            <input
              value={form.duration}
              onChange={(event) => update('duration', event.target.value)}
              placeholder="2s 14dk veya 8 bölüm"
              className={inputClass}
            />
          </Field>
          <Field label="Yaş Sınırı">
            <select
              value={form.rating}
              onChange={(event) => update('rating', event.target.value)}
              className={inputClass}
            >
              {RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Türler">
          <input
            value={form.genres}
            onChange={(event) => update('genres', event.target.value)}
            placeholder="Dram, Belgesel, Stand-up"
            className={inputClass}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CONTENT_GENRES.map((genre) => {
              const selected = form.genres
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
                .includes(genre)
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => {
                    const current = form.genres
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean)
                    if (current.includes(genre)) {
                      update('genres', current.filter((value) => value !== genre).join(', '))
                    } else {
                      update('genres', [...current, genre].join(', '))
                    }
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs transition ${
                    selected
                      ? 'bg-sineoda-gold text-sineoda-bg'
                      : 'bg-white/10 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {genre}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-sineoda-muted">
            Filtreler: {BROWSE_GENRES.join(', ')}
          </p>
        </Field>

        <ImageUpload
          label="Poster *"
          value={form.poster}
          onChange={(url) => update('poster', url)}
        />

        <ImageUpload
          label="Arka Plan"
          value={form.backdrop}
          onChange={(url) => update('backdrop', url)}
        />

        <Field label="Stream Sağlayıcı">
          <select
            value={form.streamProvider}
            onChange={(event) => update('streamProvider', event.target.value)}
            className={inputClass}
          >
            {STREAM_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </Field>

        <VideoUpload
          label="Stream URL / Video *"
          value={form.videoUrl}
          onChange={(url) => update('videoUrl', url)}
        />
        <p className="-mt-3 text-xs text-sineoda-muted">
          Mux, Cloudflare Stream, Bunny.net veya lisanslı CDN&apos;den aldığın HLS/MP4 bağlantısını yapıştır.
        </p>

        <VideoUpload
          label="Fragman URL"
          value={form.trailerUrl}
          onChange={(url) => update('trailerUrl', url)}
        />
        <p className="-mt-3 text-xs text-sineoda-muted">
          Ana sayfa ve öne çıkan alanda oynatılır. Boş bırakılırsa ana video kullanılır.
        </p>

        <Field label="Video Formatı">
          <select
            value={form.videoFormat}
            onChange={(event) => update('videoFormat', event.target.value as 'standard' | 'vertical')}
            className={inputClass}
          >
            <option value="standard">Standart (yatay 16:9)</option>
            <option value="vertical">Dikey dizi (9:16)</option>
          </select>
        </Field>

        <label className="flex items-center gap-3 text-sm text-white/85">
          <input
            type="checkbox"
            checked={form.isNew}
            onChange={(event) => update('isNew', event.target.checked)}
            className="h-4 w-4 rounded accent-sineoda-gold"
          />
          &quot;Yeni&quot; rozeti göster (30 gün)
        </label>

        <label className="flex items-center gap-3 text-sm text-white/85">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => update('featured', event.target.checked)}
            className="h-4 w-4 rounded accent-sineoda-gold"
          />
          Öne çıkan içerik olarak ayarla
        </label>

        {form.poster && (
          <div className="flex gap-4">
            <img src={resolveMediaUrl(form.poster)} alt="" className="h-36 w-24 rounded-lg object-cover" />
            {form.backdrop && (
              <img src={resolveMediaUrl(form.backdrop)} alt="" className="h-36 flex-1 rounded-lg object-cover" />
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : isEdit ? 'Kaydet' : 'Oluştur'}
          </button>
          <Link
            to="/admin/icerikler"
            className="rounded-lg border border-white/10 px-5 py-3 text-sm text-white/80 hover:bg-white/5"
          >
            İptal
          </Link>
        </div>
      </form>

      {isEdit && id && form.type === 'dizi' && <AdminEpisodesPanel contentId={id} />}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-white/85">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold'
