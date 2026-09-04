import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchAdminFilmSchools,
  fetchAdminStudentCinemaDetail,
  resolveMediaUrl,
  updateAdminStudentCinemaContent,
  type AdminFilmSchool,
  type AdminStudentCinemaDocument,
  type AdminStudentCinemaItem,
} from '../../api/client'
import { ImageUpload } from '../../components/admin/ImageUpload'
import { VideoUpload } from '../../components/admin/VideoUpload'
import { AdminStudentCinemaAwardPanel } from '../../components/admin/AdminStudentCinemaAwardPanel'
import { FestivalCreditsEditor } from '../../components/admin/FestivalCreditsEditor'
import { CREATOR_DOC_TYPES } from '../../constants/creatorLegal'
import { buildCredits, creditsToForm } from '../../utils/credits'
import { buildFestivals, festivalsToForm } from '../../utils/duration'
import type { FestivalEntry } from '../../constants/festivals'
import { getStudentDisplayName } from '../../utils/studentDisplayName'
import { formatLicenseDate, getLicenseDaysRemaining, toDateInputValue } from '../../utils/license'
import type { MonthlyAward } from '../../types/content'

const todayInput = () => new Date().toISOString().slice(0, 10)

const FORMAT_LABELS: Record<string, string> = {
  main: 'Ana film',
  bts: 'Kamera arkası',
  teacher_note: 'Hoca notu',
}

const REVIEW_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'Plooy incelemede',
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
  durationMinutes: string
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
  festivals: FestivalEntry[]
  contentAddedAt: string
  licenseUnlimited: boolean
  licenseExpiresAt: string
}

function addYearsToDateInput(base: string, years: number) {
  const date = new Date(base)
  if (Number.isNaN(date.getTime())) return ''
  date.setFullYear(date.getFullYear() + years)
  return date.toISOString().slice(0, 10)
}

function itemToForm(item: AdminStudentCinemaItem): DetailForm {
  const credits = creditsToForm(item.credits)
  return {
    title: item.title,
    description: item.description,
    year: item.year,
    duration: item.duration,
    durationMinutes: item.durationMinutes ? String(item.durationMinutes) : '',
    rating: item.rating,
    type: item.type,
    genres: item.genres.join(', '),
    poster: item.poster,
    backdrop: item.backdrop,
    videoUrl: item.videoUrl,
    trailerUrl: item.trailerUrl ?? '',
    schoolId: item.schoolId ?? '',
    ...credits,
    festivals: festivalsToForm(item.festivals),
    contentAddedAt: toDateInputValue(item.contentAddedAt) || todayInput(),
    licenseUnlimited: item.licenseUnlimited,
    licenseExpiresAt: toDateInputValue(item.licenseExpiresAt),
  }
}

export function AdminStudentCinemaFormPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [schools, setSchools] = useState<AdminFilmSchool[]>([])
  const [item, setItem] = useState<AdminStudentCinemaItem | null>(null)
  const [documents, setDocuments] = useState<AdminStudentCinemaDocument[]>([])
  const [form, setForm] = useState<DetailForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [monthlyAward, setMonthlyAward] = useState<MonthlyAward>({
    enabled: false,
    period: null,
    badge: null,
    prize: null,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setMessage('')

    void Promise.all([fetchAdminFilmSchools(), fetchAdminStudentCinemaDetail(id)])
      .then(([schoolResult, detailResult]) => {
        if (cancelled) return
        setSchools(schoolResult.schools)
        setItem(detailResult.item)
        setDocuments(detailResult.documents)
        setForm(itemToForm(detailResult.item))
        setMonthlyAward(
          detailResult.item.monthlyAward ?? {
            enabled: false,
            period: null,
            badge: null,
            prize: null,
          },
        )
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
  }, [id])

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
      const result = await updateAdminStudentCinemaContent(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        year: form.year,
        duration:
          form.type === 'dizi'
            ? form.duration.trim()
            : form.duration.trim() || (Number(form.durationMinutes) > 0 ? `${form.durationMinutes} dk` : ''),
        durationMinutes:
          form.type === 'dizi' ? null : Number(form.durationMinutes) > 0 ? Number(form.durationMinutes) : null,
        rating: form.rating,
        type: form.type,
        genres,
        poster: form.poster,
        backdrop: form.backdrop || form.poster,
        videoUrl: form.videoUrl.trim(),
        trailerUrl: form.trailerUrl.trim(),
        schoolId: form.schoolId || null,
        credits: buildCredits(form),
        festivals: buildFestivals(form.festivals),
        contentAddedAt: form.contentAddedAt,
        licenseUnlimited: form.licenseUnlimited,
        licenseExpiresAt: form.licenseUnlimited ? null : form.licenseExpiresAt || null,
        monthlyAward,
      })
      setItem(result.item)
      setForm(itemToForm(result.item))
      setMonthlyAward(
        result.item.monthlyAward ?? {
          enabled: false,
          period: null,
          badge: null,
          prize: null,
        },
      )
      setMessage('Kaydedildi.')
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
      const result = await updateAdminStudentCinemaContent(id, payload)
      setItem(result.item)
      setForm(itemToForm(result.item))
      setMessage(successMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız.')
    } finally {
      setActionLoading(false)
    }
  }

  const studentLabel = item
    ? item.displayName ?? item.creatorName ?? getStudentDisplayName(item) ?? '—'
    : '—'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/admin/genc-sinema"
            className="inline-flex items-center gap-1 text-sm text-plooy-muted hover:text-white"
          >
            ← Genç Sinema listesi
          </Link>
          <p className="mt-2 text-xs uppercase tracking-wide text-emerald-300/80">Genç Sinema · Düzenle</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">{item?.title ?? 'Yükleniyor…'}</h1>
          {item ? (
            <p className="mt-1 text-sm text-plooy-muted">
              {studentLabel} · {item.schoolName ?? 'Okul belirtilmemiş'}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-plooy-muted">Detay yükleniyor…</p>
      ) : !item || !form ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error || 'İçerik bulunamadı.'}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => navigate('/admin/genc-sinema')}
              className="text-plooy-gold hover:underline"
            >
              Listeye dön
            </button>
          </div>
        </div>
      ) : (
        <>
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
                <p className="text-xs text-plooy-muted">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold text-emerald-300">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-white/10 bg-[#11141c] p-4">
            <h2 className="font-medium text-white">Öğrenci & Okul</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-plooy-muted">Öğrenci / Yönetmen</dt>
                <dd className="mt-0.5 text-white">{studentLabel}</dd>
              </div>
              <div>
                <dt className="text-plooy-muted">E-posta</dt>
                <dd className="mt-0.5 text-white">{item.creatorEmail ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-plooy-muted">Telefon</dt>
                <dd className="mt-0.5 text-white">{item.creatorPhone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-plooy-muted">Proje / Stüdyo</dt>
                <dd className="mt-0.5 text-white">{item.studioName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-plooy-muted">Okul</dt>
                <dd className="mt-0.5 text-white">{item.schoolName ?? '—'}</dd>
              </div>
              {item.projectCrew ? (
                <div className="sm:col-span-2">
                  <dt className="text-plooy-muted">Ekip notu</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-white">{item.projectCrew}</dd>
                </div>
              ) : null}
              {item.parentTitle ? (
                <div className="sm:col-span-2">
                  <dt className="text-plooy-muted">Bağlı ana film</dt>
                  <dd className="mt-0.5 text-white">{item.parentTitle}</dd>
                </div>
              ) : null}
            </dl>

            {documents.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-plooy-muted">Belgeler</p>
                <ul className="mt-2 space-y-2">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/85">{docTypeLabel(doc.docType)}</span>
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
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-[#11141c] p-4">
            <h2 className="font-medium text-white">Yayın Kontrolü</h2>
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
                onClick={() => void runReviewAction({ reviewStatus: 'published', publishNow: true }, 'Yayına alındı.')}
                className="rounded-lg bg-plooy-gold px-3 py-1.5 text-xs font-semibold text-plooy-bg disabled:opacity-40"
              >
                Yayınla
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void runReviewAction({ reviewStatus: 'pending' }, 'İncelemeye alındı.')}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200"
              >
                {item.reviewStatus === 'rejected' ? 'İncelemeye Al' : 'Yayından Al / İncelemeye Al'}
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

          {item.contentFormat === 'main' ? (
            <AdminStudentCinemaAwardPanel
              award={monthlyAward}
              disabled={saving || actionLoading}
              onChange={setMonthlyAward}
            />
          ) : null}

          <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h2 className="font-medium text-amber-200">Telif hakkı süresi</h2>
            <p className="mt-1 text-xs text-plooy-muted">
              Sınırsız veya belirli bitiş tarihi. Yalnızca admin görür.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-plooy-muted">Platforma eklenme</span>
                <input
                  type="date"
                  required
                  value={form.contentAddedAt}
                  onChange={(event) => setForm({ ...form, contentAddedAt: event.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-plooy-muted">Telif bitiş tarihi</span>
                <input
                  type="date"
                  value={form.licenseExpiresAt}
                  disabled={form.licenseUnlimited}
                  onChange={(event) => setForm({ ...form, licenseExpiresAt: event.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white disabled:opacity-50"
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-white/85">
              <input
                type="checkbox"
                checked={form.licenseUnlimited}
                onChange={(event) => setForm({ ...form, licenseUnlimited: event.target.checked })}
                className="rounded"
              />
              Sınırsız telif hakkı
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 5].map((years) => (
                <button
                  key={years}
                  type="button"
                  disabled={form.licenseUnlimited}
                  onClick={() =>
                    setForm({
                      ...form,
                      licenseUnlimited: false,
                      licenseExpiresAt: addYearsToDateInput(form.contentAddedAt, years),
                    })
                  }
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 disabled:opacity-50"
                >
                  +{years} yıl
                </button>
              ))}
            </div>
            {!form.licenseUnlimited && form.licenseExpiresAt && (
              <p className="mt-2 text-xs text-plooy-muted">
                {formatLicenseDate(form.licenseExpiresAt)} · {getLicenseDaysRemaining(form.licenseExpiresAt)} gün kaldı
              </p>
            )}
          </section>

          <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-white/10 bg-[#11141c] p-4">
            <h2 className="font-medium text-white">İçerik & Künye</h2>

            <label className="block">
              <span className="mb-1 block text-xs text-plooy-muted">Başlık</span>
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-plooy-muted">Açıklama</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-plooy-muted">Okul</span>
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
                <span className="mb-1 block text-xs text-plooy-muted">Yıl</span>
                <input
                  type="number"
                  value={form.year}
                  onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-plooy-muted">Süre (dakika)</span>
                <input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
                  placeholder="18"
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                />
              </label>
            </div>

            <FestivalCreditsEditor
              entries={form.festivals}
              onChange={(festivals) => setForm({ ...form, festivals })}
            />

            <label className="block">
              <span className="mb-1 block text-xs text-plooy-muted">Türler (virgülle)</span>
              <input
                value={form.genres}
                onChange={(event) => setForm({ ...form, genres: event.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-plooy-muted">Yönetmen(ler)</span>
                <textarea
                  rows={2}
                  value={form.directors}
                  onChange={(event) => setForm({ ...form, directors: event.target.value })}
                  placeholder="Her satıra bir isim veya virgülle"
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-plooy-muted">Yapımcı(lar)</span>
                <textarea
                  rows={2}
                  value={form.producers}
                  onChange={(event) => setForm({ ...form, producers: event.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs text-plooy-muted">Oyuncular / Ekip</span>
                <textarea
                  rows={2}
                  value={form.cast}
                  onChange={(event) => setForm({ ...form, cast: event.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs text-plooy-muted">Yapım / Okul stüdyosu</span>
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
                className="inline-block text-sm text-plooy-gold hover:underline"
              >
                Videoyu yeni sekmede aç
              </a>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-plooy-gold px-4 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
              >
                {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
              </button>
              <Link
                to="/admin/genc-sinema"
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"
              >
                Listeye dön
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
