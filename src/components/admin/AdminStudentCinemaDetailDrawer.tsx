import { useEffect, useState, type FormEvent } from 'react'
import {
  fetchAdminStudentCinemaDetail,
  resolveMediaUrl,
  updateAdminStudentCinemaContent,
  type AdminFilmSchool,
  type AdminStudentCinemaDocument,
  type AdminStudentCinemaItem,
} from '../../api/client'
import { ImageUpload } from './ImageUpload'
import { VideoUpload } from './VideoUpload'
import { CREATOR_DOC_TYPES } from '../../constants/creatorLegal'
import { buildCredits, creditsToForm } from '../../utils/credits'

const FORMAT_LABELS: Record<string, string> = {
  main: 'Ana film',
  bts: 'Kamera arkası',
  teacher_note: 'Hoca notu',
}

const REVIEW_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'Sineoda incelemede',
  published: 'Yayında',
  rejected: 'Reddedildi',
}

const SCHOOL_REVIEW_LABELS: Record<string, string> = {
  none: 'Okul onayı yok',
  pending: 'Okul bekliyor',
  approved: 'Okul onaylı',
  rejected: 'Okul reddi',
}

function docTypeLabel(value: string) {
  return CREATOR_DOC_TYPES.find((entry) => entry.value === value)?.label ?? value
}

interface DetailForm {
  title: string
  description: string
  year: number
  duration: string
  rating: string
  type: AdminStudentCinemaItem['type']
  genres: string
  poster: string
  backdrop: string
  videoUrl: string
  trailerUrl: string
  schoolId: string
  directors: string
  producers: string
  cast: string
  studio: string
}

function itemToForm(item: AdminStudentCinemaItem): DetailForm {
  const credits = creditsToForm(item.credits)
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
    trailerUrl: item.trailerUrl ?? '',
    schoolId: item.schoolId ?? '',
    ...credits,
  }
}

interface AdminStudentCinemaDetailDrawerProps {
  contentId: string | null
  schools: AdminFilmSchool[]
  onClose: () => void
  onUpdated: () => void
}

export function AdminStudentCinemaDetailDrawer({
  contentId,
  schools,
  onClose,
  onUpdated,
}: AdminStudentCinemaDetailDrawerProps) {
  const [item, setItem] = useState<AdminStudentCinemaItem | null>(null)
  const [documents, setDocuments] = useState<AdminStudentCinemaDocument[]>([])
  const [form, setForm] = useState<DetailForm | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!contentId) {
      setItem(null)
      setDocuments([])
      setForm(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setMessage('')

    void fetchAdminStudentCinemaDetail(contentId)
      .then((result) => {
        if (cancelled) return
        setItem(result.item)
        setDocuments(result.documents)
        setForm(itemToForm(result.item))
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Detay yüklenemedi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [contentId])

  if (!contentId) return null

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const genres = form.genres
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      const result = await updateAdminStudentCinemaContent(contentId, {
        title: form.title.trim(),
        description: form.description.trim(),
        year: form.year,
        duration: form.duration.trim(),
        rating: form.rating,
        type: form.type,
        genres,
        poster: form.poster,
        backdrop: form.backdrop || form.poster,
        videoUrl: form.videoUrl.trim(),
        trailerUrl: form.trailerUrl.trim(),
        schoolId: form.schoolId || null,
        credits: buildCredits(form),
      })
      setItem(result.item)
      setForm(itemToForm(result.item))
      setMessage('Kaydedildi.')
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const runReviewAction = async (payload: Record<string, unknown>, successMessage: string) => {
    setActionLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await updateAdminStudentCinemaContent(contentId, payload)
      setItem(result.item)
      setForm(itemToForm(result.item))
      setMessage(successMessage)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <button type="button" aria-label="Kapat" className="flex-1" onClick={onClose} />
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0d0f14] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-300/80">Genç Sinema · Detay</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{item?.title ?? 'Yükleniyor…'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-sineoda-muted hover:bg-white/5 hover:text-white"
          >
            Kapat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-sineoda-muted">Detay yükleniyor…</p>
          ) : !item || !form ? (
            <p className="text-sm text-red-300">{error || 'İçerik bulunamadı.'}</p>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {message}
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/80">
                  {FORMAT_LABELS[item.contentFormat] ?? item.contentFormat}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/80">
                  {REVIEW_LABELS[item.reviewStatus] ?? item.reviewStatus}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/80">
                  {SCHOOL_REVIEW_LABELS[item.schoolReviewStatus] ?? item.schoolReviewStatus}
                </span>
              </div>

              <section className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: 'İzlenme', value: `${item.watchMinutes ?? 0} dk` },
                  { label: 'İzlenme sayısı', value: String(item.watchCount ?? 0) },
                  { label: 'Beğeni', value: String(item.likes ?? 0) },
                  { label: 'İzleyici', value: String(item.viewers ?? 0) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/10 bg-[#11141c] p-3">
                    <p className="text-xs text-sineoda-muted">{stat.label}</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-300">{stat.value}</p>
                  </div>
                ))}
              </section>

              <section className="rounded-xl border border-white/10 bg-[#11141c] p-4">
                <h3 className="font-medium text-white">Öğrenci & Okul</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-sineoda-muted">Öğrenci</dt>
                    <dd className="mt-0.5 text-white">{item.displayName ?? item.creatorName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sineoda-muted">E-posta</dt>
                    <dd className="mt-0.5 text-white">{item.creatorEmail ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sineoda-muted">Proje / Stüdyo</dt>
                    <dd className="mt-0.5 text-white">{item.studioName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sineoda-muted">Okul</dt>
                    <dd className="mt-0.5 text-white">{item.schoolName ?? '—'}</dd>
                  </div>
                  {item.projectCrew ? (
                    <div className="sm:col-span-2">
                      <dt className="text-sineoda-muted">Ekip notu</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-white">{item.projectCrew}</dd>
                    </div>
                  ) : null}
                  {item.parentTitle ? (
                    <div className="sm:col-span-2">
                      <dt className="text-sineoda-muted">Bağlı ana film</dt>
                      <dd className="mt-0.5 text-white">{item.parentTitle}</dd>
                    </div>
                  ) : null}
                </dl>

                {documents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide text-sineoda-muted">Belgeler</p>
                    <ul className="mt-2 space-y-2">
                      {documents.map((doc) => (
                        <li key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-white/85">{docTypeLabel(doc.docType)}</span>
                          <a
                            href={resolveMediaUrl(doc.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sineoda-gold hover:underline"
                          >
                            Görüntüle
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-[#11141c] p-4">
                <h3 className="font-medium text-white">Yayın Kontrolü</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.schoolReviewStatus !== 'approved' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void runReviewAction({ schoolReviewStatus: 'approved' }, 'Okul onayı verildi.')}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200"
                    >
                      Okul Onayı Ver
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={actionLoading || item.schoolReviewStatus !== 'approved'}
                    onClick={() => void runReviewAction({ reviewStatus: 'published' }, 'Yayına alındı.')}
                    className="rounded-lg bg-sineoda-gold px-3 py-1.5 text-xs font-semibold text-sineoda-bg disabled:opacity-40"
                  >
                    Yayınla
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void runReviewAction({ reviewStatus: 'pending' }, 'Yayından alındı.')}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80"
                  >
                    Yayından Al
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void runReviewAction({ reviewStatus: 'rejected' }, 'Reddedildi.')}
                    className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300"
                  >
                    Reddet
                  </button>
                </div>
              </section>

              <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-white/10 bg-[#11141c] p-4">
                <h3 className="font-medium text-white">İçerik & Künye</h3>

                <label className="block">
                  <span className="mb-1 block text-xs text-sineoda-muted">Başlık</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-sineoda-muted">Açıklama</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-sineoda-muted">Okul</span>
                  <select
                    value={form.schoolId}
                    onChange={(event) => setForm({ ...form, schoolId: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  >
                    <option value="">Okul seçin</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs text-sineoda-muted">Yıl</span>
                    <input
                      type="number"
                      value={form.year}
                      onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-sineoda-muted">Süre</span>
                    <input
                      value={form.duration}
                      onChange={(event) => setForm({ ...form, duration: event.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs text-sineoda-muted">Türler (virgülle)</span>
                  <input
                    value={form.genres}
                    onChange={(event) => setForm({ ...form, genres: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs text-sineoda-muted">Yönetmen(ler)</span>
                    <textarea
                      rows={2}
                      value={form.directors}
                      onChange={(event) => setForm({ ...form, directors: event.target.value })}
                      placeholder="Her satıra bir isim veya virgülle"
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-sineoda-muted">Yapımcı(lar)</span>
                    <textarea
                      rows={2}
                      value={form.producers}
                      onChange={(event) => setForm({ ...form, producers: event.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs text-sineoda-muted">Oyuncular / Ekip</span>
                    <textarea
                      rows={2}
                      value={form.cast}
                      onChange={(event) => setForm({ ...form, cast: event.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs text-sineoda-muted">Yapım / Okul stüdyosu</span>
                    <input
                      value={form.studio}
                      onChange={(event) => setForm({ ...form, studio: event.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                    />
                  </label>
                </div>

                <ImageUpload label="Poster" value={form.poster} onChange={(url) => setForm({ ...form, poster: url })} />
                <VideoUpload
                  label="Video URL"
                  value={form.videoUrl}
                  onChange={(url) => setForm({ ...form, videoUrl: url })}
                />

                {form.videoUrl ? (
                  <a
                    href={resolveMediaUrl(form.videoUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm text-sineoda-gold hover:underline"
                  >
                    Videoyu yeni sekmede aç
                  </a>
                ) : null}

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
                >
                  {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
