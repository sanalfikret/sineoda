import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  fetchAdminCreatorContentDetail,
  resolveMediaUrl,
  updateAdminCreatorContent,
  type AdminCreatorContentDetail,
} from '../../api/client'
import { ImageUpload } from './ImageUpload'
import { VideoUpload } from './VideoUpload'
import { CONTENT_TYPES } from '../../constants/contentTypes'
import { buildCredits, creditsToForm } from '../../utils/credits'
import { formatLicenseDate, toDateInputValue } from '../../utils/license'
import { defaultScheduledDateTime, formatPublishDate, toDateTimeLocalValue } from '../../utils/publish'

const RATINGS = ['Genel', '7+', '13+', '16+', '18+']

const REVIEW_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'İncelemede',
  published: 'Yayında',
  rejected: 'Reddedildi',
}

interface AdminCreatorFilmEditorProps {
  contentId: string
  onClose: () => void
  onSaved: () => void
}

interface FilmForm {
  title: string
  description: string
  year: number
  duration: string
  rating: string
  type: AdminCreatorContentDetail['type']
  genres: string
  poster: string
  backdrop: string
  videoUrl: string
  directors: string
  producers: string
  cast: string
  studio: string
  licenseUnlimited: boolean
  licenseExpiresAt: string
  reviewStatus: 'pending' | 'published' | 'rejected'
  publishMode: 'now' | 'scheduled' | 'unpublished'
  publishedAt: string
}

function itemToForm(item: AdminCreatorContentDetail): FilmForm {
  const credits = creditsToForm(item.credits)
  const isLive = item.reviewStatus === 'published' && item.isPublished
  const isScheduled = item.reviewStatus === 'published' && item.isScheduled

  return {
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
    ...credits,
    licenseUnlimited: item.licenseUnlimited,
    licenseExpiresAt: toDateInputValue(item.licenseExpiresAt),
    reviewStatus: (item.reviewStatus as FilmForm['reviewStatus']) ?? 'pending',
    publishMode: isLive ? 'now' : isScheduled ? 'scheduled' : 'unpublished',
    publishedAt: toDateTimeLocalValue(item.publishedAt) || defaultScheduledDateTime(),
  }
}

export function AdminCreatorFilmEditor({ contentId, onClose, onSaved }: AdminCreatorFilmEditorProps) {
  const [item, setItem] = useState<AdminCreatorContentDetail | null>(null)
  const [form, setForm] = useState<FilmForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { item: data } = await fetchAdminCreatorContentDetail(contentId)
      setItem(data)
      setForm(itemToForm(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Film yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [contentId])

  useEffect(() => {
    void load()
  }, [load])

  const update = <K extends keyof FilmForm>(key: K, value: FilmForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return

    setSaving(true)
    setError('')

    try {
      let reviewStatus = form.reviewStatus
      let publishNow = false
      let publishedAt: string | null | undefined

      if (form.publishMode === 'now') {
        reviewStatus = 'published'
        publishNow = true
      } else if (form.publishMode === 'scheduled') {
        reviewStatus = 'published'
        publishedAt = new Date(form.publishedAt).toISOString()
      } else {
        reviewStatus = 'pending'
        publishedAt = null
      }

      await updateAdminCreatorContent(contentId, {
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
        credits: buildCredits(form),
        licenseUnlimited: form.licenseUnlimited,
        licenseExpiresAt: form.licenseUnlimited ? null : form.licenseExpiresAt || null,
        reviewStatus,
        publishNow,
        publishedAt,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    setSaving(true)
    setError('')
    try {
      await updateAdminCreatorContent(contentId, { reviewStatus: 'rejected', publishedAt: null })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reddedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11141c] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-sineoda-muted">Yapımcı filmi</p>
            <h2 className="text-lg font-bold text-white">{item?.title ?? 'Film düzenle'}</h2>
            {item && (
              <p className="mt-1 text-sm text-sineoda-muted">
                {item.studioName} · {item.creatorName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            Kapat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading || !form ? (
            <p className="text-sm text-sineoda-muted">Yükleniyor...</p>
          ) : (
            <>
              {item && (
                <div className="mb-5 grid gap-3 rounded-xl border border-white/5 bg-[#0d0f14] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-sineoda-muted">İzlenme süresi</p>
                    <p className="text-sm font-medium text-white">{item.watchMinutes ?? 0} dk</p>
                  </div>
                  <div>
                    <p className="text-xs text-sineoda-muted">Nitelikli izlenme</p>
                    <p className="text-sm font-medium text-white">{item.qualifiedMinutes ?? 0} dk</p>
                  </div>
                  <div>
                    <p className="text-xs text-sineoda-muted">İzleyici</p>
                    <p className="text-sm font-medium text-white">{item.viewers ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-sineoda-muted">Beğeni</p>
                    <p className="text-sm font-medium text-white">{item.likes ?? 0}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-sineoda-muted">Durum</p>
                    <p className="text-sm text-white/90">
                      {REVIEW_LABELS[item.reviewStatus] ?? item.reviewStatus}
                      {item.isScheduled && ` · Planlandı (${formatPublishDate(item.publishedAt)})`}
                      {item.isPublished && item.reviewStatus === 'published' && ' · Yayında'}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form id="creator-film-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-sm text-white/85">Başlık</span>
                    <input
                      required
                      value={form.title}
                      onChange={(event) => update('title', event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-sm text-white/85">Açıklama</span>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(event) => update('description', event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">Yıl</span>
                    <input
                      type="number"
                      value={form.year}
                      onChange={(event) => update('year', Number(event.target.value))}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">Süre</span>
                    <input
                      value={form.duration}
                      onChange={(event) => update('duration', event.target.value)}
                      placeholder="1s 32dk"
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">Tür</span>
                    <select
                      value={form.type}
                      onChange={(event) => update('type', event.target.value as FilmForm['type'])}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    >
                      {CONTENT_TYPES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">Yaş sınırı</span>
                    <select
                      value={form.rating}
                      onChange={(event) => update('rating', event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    >
                      {RATINGS.map((rating) => (
                        <option key={rating} value={rating}>
                          {rating}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-sm text-white/85">Türler (virgülle)</span>
                    <input
                      value={form.genres}
                      onChange={(event) => update('genres', event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>

                <section className="space-y-4 rounded-xl border border-white/5 bg-[#0d0f14] p-4">
                  <h3 className="text-sm font-semibold text-white">Künye</h3>
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">Yönetmen(ler)</span>
                    <textarea
                      rows={2}
                      value={form.directors}
                      onChange={(event) => update('directors', event.target.value)}
                      placeholder="Her satır veya virgülle ayırın"
                      className="w-full rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">Yapımcı(lar)</span>
                    <textarea
                      rows={2}
                      value={form.producers}
                      onChange={(event) => update('producers', event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">Oyuncular</span>
                    <textarea
                      rows={2}
                      value={form.cast}
                      onChange={(event) => update('cast', event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">Stüdyo</span>
                    <input
                      value={form.studio}
                      onChange={(event) => update('studio', event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white"
                    />
                  </label>
                </section>

                <section className="space-y-4">
                  <ImageUpload label="Afiş" value={form.poster} onChange={(url) => update('poster', url)} />
                  <ImageUpload label="Arka plan" value={form.backdrop} onChange={(url) => update('backdrop', url)} />
                  <VideoUpload label="Video" value={form.videoUrl} onChange={(url) => update('videoUrl', url)} />
                  {form.poster && (
                    <img
                      src={resolveMediaUrl(form.poster)}
                      alt=""
                      className="h-40 w-28 rounded-lg object-cover"
                    />
                  )}
                </section>

                <section className="space-y-4 rounded-xl border border-white/5 bg-[#0d0f14] p-4">
                  <h3 className="text-sm font-semibold text-white">Telif hakkı</h3>
                  <label className="flex items-center gap-2 text-sm text-white/85">
                    <input
                      type="checkbox"
                      checked={form.licenseUnlimited}
                      onChange={(event) => update('licenseUnlimited', event.target.checked)}
                      className="rounded"
                    />
                    Sınırsız lisans
                  </label>
                  {!form.licenseUnlimited && (
                    <label className="block">
                      <span className="mb-1 block text-sm text-white/85">Telif bitiş tarihi</span>
                      <input
                        type="date"
                        value={form.licenseExpiresAt}
                        onChange={(event) => update('licenseExpiresAt', event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white"
                      />
                    </label>
                  )}
                  {item && !form.licenseUnlimited && item.licenseExpiresAt && (
                    <p className="text-xs text-sineoda-muted">
                      Mevcut: {formatLicenseDate(item.licenseExpiresAt)}
                      {item.licenseExpired && ' · Süresi dolmuş'}
                      {item.licenseExpiringSoon && !item.licenseExpired && ' · Yakında bitiyor'}
                    </p>
                  )}
                </section>

                <section className="space-y-4 rounded-xl border border-white/5 bg-[#0d0f14] p-4">
                  <h3 className="text-sm font-semibold text-white">Yayın</h3>
                  <div className="space-y-2">
                    {(
                      [
                        ['now', 'Hemen yayınla'],
                        ['scheduled', 'İleri tarihte yayınla'],
                        ['unpublished', 'Yayından kaldır / incelemede tut'],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 text-sm text-white/85">
                        <input
                          type="radio"
                          name="publishMode"
                          checked={form.publishMode === value}
                          onChange={() => update('publishMode', value)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {form.publishMode === 'scheduled' && (
                    <label className="block">
                      <span className="mb-1 block text-sm text-white/85">Yayın tarihi</span>
                      <input
                        type="datetime-local"
                        value={form.publishedAt}
                        onChange={(event) => update('publishedAt', event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white"
                      />
                    </label>
                  )}
                </section>
              </form>
            </>
          )}
        </div>

        {!loading && form && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleReject()}
              className="rounded-lg bg-red-500/15 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/25 disabled:opacity-60"
            >
              Reddet
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                İptal
              </button>
              <button
                type="submit"
                form="creator-film-form"
                disabled={saving}
                className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-black hover:bg-sineoda-gold/90 disabled:opacity-60"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
