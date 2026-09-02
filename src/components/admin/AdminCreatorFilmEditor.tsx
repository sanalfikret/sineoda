import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  fetchAdminCreatorContentDetail,
  fetchAdminCreatorSourceDownload,
  resolveMediaUrl,
  updateAdminCreatorContent,
  type AdminCreatorContentDetail,
} from '../../api/client'
import { ImageUpload } from './ImageUpload'
import { VideoUpload } from './VideoUpload'
import { CONTENT_TYPES } from '../../constants/contentTypes'
import { CREATOR_DOC_TYPES } from '../../constants/creatorLegal'
import { buildCredits, creditsToForm } from '../../utils/credits'
import { formatLicenseDate, getLicenseDaysRemaining, toDateInputValue } from '../../utils/license'
import { defaultScheduledDateTime, formatPublishDate, toDateTimeLocalValue } from '../../utils/publish'

const RATINGS = ['Genel', '7+', '13+', '16+', '18+']
const todayInput = () => new Date().toISOString().slice(0, 10)

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
  sourceVideoUrl: string
  videoUrl: string
  directors: string
  producers: string
  cast: string
  studio: string
  contentAddedAt: string
  licenseUnlimited: boolean
  licenseExpiresAt: string
  publishMode: 'review' | 'scheduled' | 'live'
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
    sourceVideoUrl: item.sourceVideoUrl ?? item.videoUrl,
    videoUrl: item.videoUrl,
    ...credits,
    contentAddedAt: toDateInputValue(item.contentAddedAt) || todayInput(),
    licenseUnlimited: item.licenseUnlimited,
    licenseExpiresAt: toDateInputValue(item.licenseExpiresAt),
    publishMode: isLive ? 'live' : isScheduled ? 'scheduled' : 'review',
    publishedAt: toDateTimeLocalValue(item.publishedAt) || defaultScheduledDateTime(),
  }
}

function addYearsToDateInput(base: string, years: number) {
  const date = new Date(base)
  if (Number.isNaN(date.getTime())) return ''
  date.setFullYear(date.getFullYear() + years)
  return date.toISOString().slice(0, 10)
}

export function AdminCreatorFilmEditor({ contentId, onClose, onSaved }: AdminCreatorFilmEditorProps) {
  const [item, setItem] = useState<AdminCreatorContentDetail | null>(null)
  const [form, setForm] = useState<FilmForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
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

  const handleCopySource = async () => {
    if (!form?.sourceVideoUrl) return
    await navigator.clipboard.writeText(form.sourceVideoUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadSource = async () => {
    setDownloading(true)
    setError('')
    try {
      const result = await fetchAdminCreatorSourceDownload(contentId)
      if ('url' in result && result.external) {
        window.open(resolveMediaUrl(result.url), '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video indirilemedi.')
    } finally {
      setDownloading(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return

    if (!form.licenseUnlimited && !form.licenseExpiresAt) {
      setError('Telif bitiş tarihi girin veya sınırsız lisans seçin.')
      return
    }

    if (form.publishMode !== 'review' && !form.publishedAt) {
      setError('İlk yayın tarihi zorunlu.')
      return
    }

    setSaving(true)
    setError('')

    try {
      let reviewStatus: 'pending' | 'published' = 'pending'
      let publishedAt: string | null = null

      if (form.publishMode === 'scheduled' || form.publishMode === 'live') {
        reviewStatus = 'published'
        publishedAt = new Date(form.publishedAt).toISOString()
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
        sourceVideoUrl: form.sourceVideoUrl.trim(),
        videoUrl: form.videoUrl.trim() || form.sourceVideoUrl.trim(),
        credits: buildCredits(form),
        contentAddedAt: form.contentAddedAt,
        licenseUnlimited: form.licenseUnlimited,
        licenseExpiresAt: form.licenseUnlimited ? null : form.licenseExpiresAt || null,
        reviewStatus,
        publishedAt,
        ...(form.publishMode === 'live' && new Date(form.publishedAt) <= new Date()
          ? { publishNow: true }
          : {}),
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
    const reviewNote = window.prompt('Red gerekçesi (yapımcı panelinde görünür):')?.trim()
    if (reviewNote === undefined) return
    setSaving(true)
    setError('')
    try {
      await updateAdminCreatorContent(contentId, {
        reviewStatus: 'rejected',
        publishedAt: null,
        reviewNote: reviewNote || null,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reddedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const resolvedSourceUrl = form?.sourceVideoUrl ? resolveMediaUrl(form.sourceVideoUrl) : ''

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11141c] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-plooy-muted">Yapımcı filmi</p>
            <h2 className="text-lg font-bold text-white">{item?.title ?? 'Film düzenle'}</h2>
            {item && (
              <p className="mt-1 text-sm text-plooy-muted">
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
            <p className="text-sm text-plooy-muted">Yükleniyor...</p>
          ) : (
            <>
              {item && (
                <div className="mb-5 grid gap-3 rounded-xl border border-white/5 bg-[#0d0f14] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-plooy-muted">İzlenme süresi</p>
                    <p className="text-sm font-medium text-white">{item.watchMinutes ?? 0} dk</p>
                  </div>
                  <div>
                    <p className="text-xs text-plooy-muted">Nitelikli izlenme</p>
                    <p className="text-sm font-medium text-white">{item.qualifiedMinutes ?? 0} dk</p>
                  </div>
                  <div>
                    <p className="text-xs text-plooy-muted">İzleyici</p>
                    <p className="text-sm font-medium text-white">{item.viewers ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-plooy-muted">Beğeni</p>
                    <p className="text-sm font-medium text-white">{item.likes ?? 0}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-plooy-muted">Durum</p>
                    <p className="text-sm text-white/90">
                      {REVIEW_LABELS[item.reviewStatus] ?? item.reviewStatus}
                      {item.isScheduled && ` · Planlandı (${formatPublishDate(item.publishedAt)})`}
                      {item.isPublished && item.reviewStatus === 'published' && ' · Yayında'}
                    </p>
                  </div>
                </div>
              )}

              {item?.applicationDocuments && item.applicationDocuments.length > 0 && (
                <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <h3 className="text-sm font-semibold text-amber-100">Başvuru belgeleri</h3>
                  <ul className="mt-3 space-y-2">
                    {item.applicationDocuments.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-white/85">
                          {CREATOR_DOC_TYPES.find((entry) => entry.value === doc.docType)?.label ?? doc.docType}
                        </span>
                        <a
                          href={resolveMediaUrl(doc.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-plooy-gold hover:underline"
                        >
                          Görüntüle
                        </a>
                      </li>
                    ))}
                  </ul>
                  {item.applicationDeclaration?.declaredAt && (
                    <p className="mt-3 text-xs text-plooy-muted">
                      Beyan tarihi:{' '}
                      {new Date(item.applicationDeclaration.declaredAt).toLocaleString('tr-TR')}
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form id="creator-film-form" onSubmit={handleSubmit} className="space-y-5">
                <section className="space-y-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-sky-200">Yapımcının gönderdiği video linki</h3>
                    <p className="mt-1 text-xs text-plooy-muted">
                      CDN&apos;e yüklemeden önce bu linkten videoyu indirin. Dış linkler yeni sekmede açılır.
                    </p>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">Kaynak link</span>
                    <input
                      required
                      type="url"
                      value={form.sourceVideoUrl}
                      onChange={(event) => update('sourceVideoUrl', event.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopySource()}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                    >
                      {copied ? 'Kopyalandı' : 'Linki kopyala'}
                    </button>
                    {resolvedSourceUrl && (
                      <a
                        href={resolvedSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                      >
                        Yeni sekmede aç
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={downloading || !form.sourceVideoUrl}
                      onClick={() => void handleDownloadSource()}
                      className="rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/25 disabled:opacity-60"
                    >
                      {downloading ? 'İndiriliyor...' : 'Videoyu indir'}
                    </button>
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-200">Yayın videosu (CDN)</h3>
                    <p className="mt-1 text-xs text-plooy-muted">
                      İndirdiğiniz videoyu CDN&apos;e yükleyin; üyelerin izleyeceği link buraya yazılır.
                    </p>
                  </div>
                  <VideoUpload label="CDN video" value={form.videoUrl} onChange={(url) => update('videoUrl', url)} />
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/85">CDN / yayın URL</span>
                    <input
                      type="url"
                      value={form.videoUrl}
                      onChange={(event) => update('videoUrl', event.target.value)}
                      placeholder="Boş bırakılırsa kaynak link kullanılır"
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    />
                  </label>
                </section>

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
                </section>

                <section className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-amber-200">Telif hakkı süresi</h3>
                    <p className="mt-1 text-xs text-plooy-muted">
                      Yalnızca admin görür. Telif bitince film otomatik katalog dışı kalır.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm text-white/85">Platforma eklenme</span>
                      <input
                        type="date"
                        required
                        value={form.contentAddedAt}
                        onChange={(event) => update('contentAddedAt', event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-white/85">Telif bitiş tarihi</span>
                      <input
                        type="date"
                        value={form.licenseExpiresAt}
                        disabled={form.licenseUnlimited}
                        onChange={(event) => update('licenseExpiresAt', event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-white/85">
                    <input
                      type="checkbox"
                      checked={form.licenseUnlimited}
                      onChange={(event) => update('licenseUnlimited', event.target.checked)}
                      className="rounded"
                    />
                    Sınırsız telif hakkı
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 5].map((years) => (
                      <button
                        key={years}
                        type="button"
                        disabled={form.licenseUnlimited}
                        onClick={() => {
                          update('licenseUnlimited', false)
                          update('licenseExpiresAt', addYearsToDateInput(form.contentAddedAt, years))
                        }}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 disabled:opacity-50"
                      >
                        +{years} yıl
                      </button>
                    ))}
                  </div>
                  {!form.licenseUnlimited && form.licenseExpiresAt && (
                    <p className="text-xs text-plooy-muted">
                      {formatLicenseDate(form.licenseExpiresAt)}
                      {' · '}
                      {getLicenseDaysRemaining(form.licenseExpiresAt)} gün kaldı
                    </p>
                  )}
                </section>

                <section className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-200">İlk yayın tarihi</h3>
                    <p className="mt-1 text-xs text-plooy-muted">
                      Admin yayın kararını verir. Planlanan tarih gelince film otomatik yayına girer.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(
                      [
                        ['review', 'İncelemede — henüz yayın yok'],
                        ['scheduled', 'Planlı yayın — ileri tarih'],
                        ['live', 'Yayında — belirlenen tarihte görünür'],
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
                  {form.publishMode !== 'review' && (
                    <label className="block">
                      <span className="mb-1 block text-sm text-white/85">İlk yayın tarihi ve saati *</span>
                      <input
                        type="datetime-local"
                        required
                        value={form.publishedAt}
                        onChange={(event) => update('publishedAt', event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                      />
                      <p className="mt-1 text-xs text-plooy-muted">
                        {form.publishMode === 'scheduled'
                          ? 'Bu tarihten önce film katalogda görünmez.'
                          : 'Geçmiş veya bugünkü tarih seçerek hemen yayına alabilirsiniz.'}
                      </p>
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
                className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-black hover:bg-plooy-gold/90 disabled:opacity-60"
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
