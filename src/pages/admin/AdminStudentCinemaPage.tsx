import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createAdminFilmSchool,
  fetchAdminFilmSchools,
  fetchAdminStudentCinemaQueue,
  reviewAdminStudentCinemaContent,
  reviewAdminStudentCinemaSchool,
  type AdminFilmSchool,
  type AdminStudentCinemaItem,
} from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { fuzzySearchMatch, sortByTurkishTitle } from '../../utils/search'

const FORMAT_LABELS: Record<string, string> = {
  main: 'Ana film',
  bts: 'Kamera arkası',
  teacher_note: 'Hoca notu',
}

const SCHOOL_REVIEW_LABELS: Record<string, string> = {
  none: '—',
  pending: 'Okul bekliyor',
  approved: 'Okul onaylı',
  rejected: 'Okul reddi',
}

const REVIEW_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'Sineoda incelemede',
  published: 'Yayında',
  rejected: 'Reddedildi',
}

export function AdminStudentCinemaPage() {
  const [tab, setTab] = useState<'schools' | 'queue'>('queue')
  const [schools, setSchools] = useState<AdminFilmSchool[]>([])
  const [queue, setQueue] = useState<AdminStudentCinemaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [queueQuery, setQueueQuery] = useState('')
  const [showSchoolForm, setShowSchoolForm] = useState(false)
  const [schoolForm, setSchoolForm] = useState({ name: '', website: '' })
  const [submittingSchool, setSubmittingSchool] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [schoolsRes, queueRes] = await Promise.all([
        fetchAdminFilmSchools(),
        fetchAdminStudentCinemaQueue(),
      ])
      setSchools(schoolsRes.schools)
      setQueue(queueRes.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredSchools = useMemo(() => {
    const filtered = schools.filter((school) => fuzzySearchMatch(schoolQuery, school.name, school.slug))
    return sortByTurkishTitle(filtered, (school) => school.name)
  }, [schools, schoolQuery])

  const filteredQueue = useMemo(() => {
    return queue.filter((item) =>
      fuzzySearchMatch(
        queueQuery,
        item.title,
        item.studioName ?? '',
        item.schoolName ?? '',
        FORMAT_LABELS[item.contentFormat] ?? item.contentFormat,
      ),
    )
  }, [queue, queueQuery])

  const handleCreateSchool = async (event: FormEvent) => {
    event.preventDefault()
    setSubmittingSchool(true)
    setError('')
    try {
      await createAdminFilmSchool({
        name: schoolForm.name,
        website: schoolForm.website,
      })
      setSchoolForm({ name: '', website: '' })
      setShowSchoolForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Okul eklenemedi.')
    } finally {
      setSubmittingSchool(false)
    }
  }

  const handleSchoolReview = async (id: string, schoolReviewStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      await reviewAdminStudentCinemaSchool(id, schoolReviewStatus)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Okul onayı güncellenemedi.')
    }
  }

  const handlePlatformReview = async (id: string, reviewStatus: 'published' | 'rejected' | 'pending') => {
    try {
      await reviewAdminStudentCinemaContent(id, reviewStatus)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İnceleme güncellenemedi.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Genç Sinema</h1>
          <p className="mt-1 text-sm text-sineoda-muted">
            Sinema okulları, okul onayı ve Sineoda inceleme kuyruğu
          </p>
        </div>
        {tab === 'schools' && (
          <button
            type="button"
            onClick={() => setShowSchoolForm((value) => !value)}
            className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
          >
            {showSchoolForm ? 'Formu kapat' : '+ Okul Ekle'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('queue')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === 'queue'
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          İnceleme Kuyruğu ({queue.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('schools')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === 'schools'
              ? 'bg-sineoda-gold/15 text-sineoda-gold'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          Okullar ({schools.length})
        </button>
      </div>

      {tab === 'schools' && showSchoolForm && (
        <form
          onSubmit={handleCreateSchool}
          className="rounded-xl border border-white/10 bg-[#11141c] p-5 space-y-4"
        >
          <h2 className="text-lg font-semibold">Yeni okul</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm text-sineoda-muted">Okul adı</span>
              <input
                required
                value={schoolForm.name}
                onChange={(event) => setSchoolForm({ ...schoolForm, name: event.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm text-sineoda-muted">Web sitesi (isteğe bağlı)</span>
              <input
                value={schoolForm.website}
                onChange={(event) => setSchoolForm({ ...schoolForm, website: event.target.value })}
                placeholder="https://"
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submittingSchool}
            className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
          >
            {submittingSchool ? 'Kaydediliyor...' : 'Okulu Kaydet'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-sineoda-muted">Yükleniyor...</p>
      ) : tab === 'schools' ? (
        <>
          <AdminSearchBar value={schoolQuery} onChange={setSchoolQuery} placeholder="Okul ara..." />
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#11141c] text-sineoda-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Okul</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Web</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => (
                  <tr key={school.id} className="border-t border-white/5">
                    <td className="px-4 py-3 font-medium text-white">{school.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          school.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {school.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sineoda-muted">
                      {school.website ? (
                        <a href={school.website} target="_blank" rel="noreferrer" className="text-sineoda-gold hover:underline">
                          Site
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <AdminSearchBar value={queueQuery} onChange={setQueueQuery} placeholder="Başlık, okul veya yapımcı ara..." />
          {filteredQueue.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-sineoda-muted">
              Bekleyen Genç Sinema başvurusu yok.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredQueue.map((item) => (
                <article key={item.id} className="rounded-xl border border-white/10 bg-[#11141c] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-emerald-300/80">
                        {FORMAT_LABELS[item.contentFormat] ?? item.contentFormat}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-sineoda-muted">
                        {item.studioName ?? 'Yapımcı'} · {item.schoolName ?? 'Okul belirtilmemiş'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/70">
                        {SCHOOL_REVIEW_LABELS[item.schoolReviewStatus] ?? item.schoolReviewStatus}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/70">
                        {REVIEW_LABELS[item.reviewStatus] ?? item.reviewStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.schoolReviewStatus !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => void handleSchoolReview(item.id, 'approved')}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                      >
                        Okul Onayı Ver
                      </button>
                    )}
                    {item.schoolReviewStatus === 'pending' && (
                      <button
                        type="button"
                        onClick={() => void handleSchoolReview(item.id, 'rejected')}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        Okul Reddi
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={item.schoolReviewStatus !== 'approved'}
                      onClick={() => void handlePlatformReview(item.id, 'published')}
                      className="rounded-lg bg-sineoda-gold px-3 py-1.5 text-xs font-semibold text-sineoda-bg disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Yayınla
                    </button>
                    <button
                      type="button"
                      onClick={() => void handlePlatformReview(item.id, 'rejected')}
                      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      Reddet
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
