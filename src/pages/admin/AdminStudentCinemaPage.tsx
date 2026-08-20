import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createAdminFilmSchool,
  deleteAdminFilmSchool,
  fetchAdminFilmSchools,
  fetchAdminStudentCinemaContent,
  fetchAdminStudentCinemaQueue,
  reviewAdminStudentCinemaContent,
  reviewAdminStudentCinemaSchool,
  updateAdminFilmSchool,
  type AdminFilmSchool,
  type AdminStudentCinemaItem,
} from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { ShareButton } from '../../components/ShareButton'
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
  const [tab, setTab] = useState<'schools' | 'queue' | 'films'>('films')
  const [schools, setSchools] = useState<AdminFilmSchool[]>([])
  const [queue, setQueue] = useState<AdminStudentCinemaItem[]>([])
  const [films, setFilms] = useState<AdminStudentCinemaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [queueQuery, setQueueQuery] = useState('')
  const [filmsQuery, setFilmsQuery] = useState('')
  const [schoolForm, setSchoolForm] = useState({ name: '', website: '' })
  const [submittingSchool, setSubmittingSchool] = useState(false)
  const [togglingSchoolId, setTogglingSchoolId] = useState<string | null>(null)
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [schoolsRes, queueRes, filmsRes] = await Promise.all([
        fetchAdminFilmSchools(),
        fetchAdminStudentCinemaQueue(),
        fetchAdminStudentCinemaContent(),
      ])
      setSchools(schoolsRes.schools)
      setQueue(queueRes.items)
      setFilms(filmsRes.items)
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

  const activeSchoolCount = useMemo(
    () => schools.filter((school) => school.status === 'active').length,
    [schools],
  )

  const filteredFilms = useMemo(() => {
    return films.filter((item) =>
      fuzzySearchMatch(
        filmsQuery,
        item.title,
        item.studioName ?? '',
        item.schoolName ?? '',
        item.creatorName ?? '',
        FORMAT_LABELS[item.contentFormat] ?? item.contentFormat,
      ),
    )
  }, [films, filmsQuery])

  const publishedFilms = useMemo(
    () => filteredFilms.filter((item) => item.reviewStatus === 'published'),
    [filteredFilms],
  )

  const filmTotals = useMemo(
    () => ({
      watchMinutes: publishedFilms.reduce((sum, item) => sum + (item.watchMinutes ?? 0), 0),
      likes: publishedFilms.reduce((sum, item) => sum + (item.likes ?? 0), 0),
      viewers: publishedFilms.reduce((sum, item) => sum + (item.viewers ?? 0), 0),
    }),
    [publishedFilms],
  )

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

  const handleToggleSchoolStatus = async (school: AdminFilmSchool) => {
    const nextStatus = school.status === 'active' ? 'inactive' : 'active'
    setTogglingSchoolId(school.id)
    setError('')
    try {
      await updateAdminFilmSchool(school.id, { status: nextStatus })
      setSchools((current) =>
        current.map((entry) => (entry.id === school.id ? { ...entry, status: nextStatus } : entry)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Okul durumu güncellenemedi.')
    } finally {
      setTogglingSchoolId(null)
    }
  }

  const handleDeleteSchool = async (school: AdminFilmSchool) => {
    if (!window.confirm(`"${school.name}" okulunu silmek istediğinize emin misiniz?`)) return
    setDeletingSchoolId(school.id)
    setError('')
    try {
      await deleteAdminFilmSchool(school.id)
      setSchools((current) => current.filter((entry) => entry.id !== school.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Okul silinemedi.')
    } finally {
      setDeletingSchoolId(null)
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
          <p className="text-sm text-sineoda-muted">
            {activeSchoolCount} aktif · {schools.length - activeSchoolCount} pasif · {schools.length} toplam
          </p>
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
          onClick={() => setTab('films')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === 'films'
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          Filmler ({films.length})
        </button>
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

      {tab === 'schools' && (
        <form
          onSubmit={handleCreateSchool}
          className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#11141c] p-4 sm:flex-row sm:items-end"
        >
          <label className="block flex-1">
            <span className="mb-1 block text-xs text-sineoda-muted">Okul adı (Üniversite — Bölüm)</span>
            <input
              required
              value={schoolForm.name}
              onChange={(event) => setSchoolForm({ ...schoolForm, name: event.target.value })}
              placeholder="Örn: İstanbul Üniversitesi — Sinema ve Televizyon"
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
            />
          </label>
          <label className="block sm:w-56">
            <span className="mb-1 block text-xs text-sineoda-muted">Web (isteğe bağlı)</span>
            <input
              value={schoolForm.website}
              onChange={(event) => setSchoolForm({ ...schoolForm, website: event.target.value })}
              placeholder="https://"
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
            />
          </label>
          <button
            type="submit"
            disabled={submittingSchool}
            className="rounded-lg bg-sineoda-gold px-5 py-2.5 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
          >
            {submittingSchool ? 'Ekleniyor...' : '+ Ekle'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-sineoda-muted">Yükleniyor...</p>
      ) : tab === 'films' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Toplam izlenme', value: `${filmTotals.watchMinutes} dk` },
              { label: 'Toplam izleyici', value: String(filmTotals.viewers) },
              { label: 'Toplam beğeni', value: String(filmTotals.likes) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-[#11141c] p-4">
                <p className="text-xs text-sineoda-muted">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">{stat.value}</p>
              </div>
            ))}
          </div>

          <AdminSearchBar value={filmsQuery} onChange={setFilmsQuery} placeholder="Film, okul veya öğrenci ara..." />

          {filteredFilms.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-sineoda-muted">
              Henüz Genç Sinema içeriği yok.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#11141c] text-sineoda-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Film</th>
                    <th className="px-4 py-3 font-medium">Öğrenci / Proje</th>
                    <th className="px-4 py-3 font-medium">Okul</th>
                    <th className="px-4 py-3 font-medium">Tür</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">İzlenme</th>
                    <th className="px-4 py-3 font-medium">İzleyici</th>
                    <th className="px-4 py-3 font-medium">Beğeni</th>
                    <th className="px-4 py-3 font-medium">Paylaş</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFilms.map((item) => (
                    <tr key={item.id} className="border-t border-white/5">
                      <td className="px-4 py-3 font-medium text-white">{item.title}</td>
                      <td className="px-4 py-3 text-sineoda-muted">
                        {item.creatorName ?? '—'}
                        {item.studioName ? ` · ${item.studioName}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sineoda-muted">{item.schoolName ?? '—'}</td>
                      <td className="px-4 py-3 text-sineoda-muted">
                        {FORMAT_LABELS[item.contentFormat] ?? item.contentFormat}
                      </td>
                      <td className="px-4 py-3">{REVIEW_LABELS[item.reviewStatus] ?? item.reviewStatus}</td>
                      <td className="px-4 py-3">{item.watchMinutes ?? 0} dk</td>
                      <td className="px-4 py-3">{item.viewers ?? 0}</td>
                      <td className="px-4 py-3">{item.likes ?? 0}</td>
                      <td className="px-4 py-3">
                        <ShareButton
                          contentId={item.id}
                          title={item.title}
                          disabled={item.reviewStatus !== 'published'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : tab === 'schools' ? (
        <>
          <AdminSearchBar value={schoolQuery} onChange={setSchoolQuery} placeholder="Üniversite veya bölüm ara..." />
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#11141c] text-sineoda-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Okul</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sineoda-muted">
                      Okul bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school) => {
                    const isActive = school.status === 'active'
                    return (
                      <tr key={school.id} className="border-t border-white/5">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{school.name}</p>
                          {school.website ? (
                            <a
                              href={school.website}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 inline-block text-xs text-sineoda-gold hover:underline"
                            >
                              Web sitesi
                            </a>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-white/10 text-white/50'
                            }`}
                          >
                            {isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={togglingSchoolId === school.id}
                              onClick={() => void handleToggleSchoolStatus(school)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                                isActive
                                  ? 'border border-white/15 text-white/70 hover:bg-white/5'
                                  : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                              }`}
                            >
                              {togglingSchoolId === school.id
                                ? '...'
                                : isActive
                                  ? 'Pasif Yap'
                                  : 'Aktif Yap'}
                            </button>
                            <button
                              type="button"
                              disabled={deletingSchoolId === school.id}
                              onClick={() => void handleDeleteSchool(school)}
                              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                            >
                              {deletingSchoolId === school.id ? '...' : 'Sil'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
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
