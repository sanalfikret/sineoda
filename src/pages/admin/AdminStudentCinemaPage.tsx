import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  bulkReviewAdminStudentCinemaContent,
  bulkDeleteAdminStudentCinemaContent,
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
import { AdminStudentCinemaDetailDrawer } from '../../components/admin/AdminStudentCinemaDetailDrawer'
import { AdminStudentCinemaFilmActions } from '../../components/admin/AdminStudentCinemaFilmActions'
import { fuzzySearchMatch, sortByTurkishTitle } from '../../utils/search'
import {
  formatPublishDate,
  isScheduledStudentFilm,
  studentFilmStatusClass,
  studentFilmStatusLabel,
} from '../../utils/studentCinemaAdmin'

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

const STATUS_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'published', label: 'Yayında' },
  { id: 'scheduled', label: 'Planlandı' },
  { id: 'pending', label: 'İncelemede' },
  { id: 'rejected', label: 'Reddedildi' },
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]['id']

function matchesStatusFilter(item: AdminStudentCinemaItem, filter: StatusFilter) {
  if (filter === 'all') return true
  if (filter === 'scheduled') return isScheduledStudentFilm(item)
  if (filter === 'published') {
    return item.reviewStatus === 'published' && !isScheduledStudentFilm(item)
  }
  return item.reviewStatus === filter
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
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
    return films.filter((item) => {
      if (!matchesStatusFilter(item, statusFilter)) return false
      if (schoolFilter !== 'all' && item.schoolId !== schoolFilter) return false
      return fuzzySearchMatch(
        filmsQuery,
        item.title,
        item.studioName ?? '',
        item.schoolName ?? '',
        item.creatorName ?? '',
        item.creatorEmail ?? '',
        FORMAT_LABELS[item.contentFormat] ?? item.contentFormat,
      )
    })
  }, [films, filmsQuery, statusFilter, schoolFilter])

  const publishedFilms = useMemo(
    () => filteredFilms.filter((item) => item.reviewStatus === 'published'),
    [filteredFilms],
  )

  const filmTotals = useMemo(
    () => ({
      watchMinutes: publishedFilms.reduce((sum, item) => sum + (item.watchMinutes ?? 0), 0),
      watchCount: publishedFilms.reduce((sum, item) => sum + (item.watchCount ?? 0), 0),
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
        item.creatorName ?? '',
        FORMAT_LABELS[item.contentFormat] ?? item.contentFormat,
      ),
    )
  }, [queue, queueQuery])

  const allVisibleSelected =
    filteredFilms.length > 0 && filteredFilms.every((item) => selectedIds.includes(item.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredFilms.some((item) => item.id === id)))
      return
    }
    setSelectedIds((current) => [...new Set([...current, ...filteredFilms.map((item) => item.id)])])
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }

  const runBulkReview = async (
    reviewStatus: 'published' | 'rejected' | 'pending',
    schoolReviewStatus?: 'approved' | 'rejected' | 'pending' | 'none',
  ) => {
    if (selectedIds.length === 0) return
    setBulkLoading(true)
    setError('')
    try {
      const result = await bulkReviewAdminStudentCinemaContent({
        ids: selectedIds,
        reviewStatus,
        schoolReviewStatus,
      })
      if (result.errors.length > 0) {
        setError(`${result.updated} güncellendi. Hatalar: ${result.errors.join('; ')}`)
      }
      setSelectedIds([])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu işlem başarısız.')
    } finally {
      setBulkLoading(false)
    }
  }

  const runBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`${selectedIds.length} film kalıcı olarak silinsin mi?`)) return
    setBulkLoading(true)
    setError('')
    try {
      const result = await bulkDeleteAdminStudentCinemaContent(selectedIds)
      if (result.errors.length > 0) {
        setError(`${result.deleted} silindi. Hatalar: ${result.errors.join('; ')}`)
      }
      setSelectedIds([])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu silme başarısız.')
    } finally {
      setBulkLoading(false)
    }
  }

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
            Her satırda Yayınla, Yayından Al, Tarih Planla ve Sil butonları var. Detay ile künyeyi düzenleyin.
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
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: 'Toplam izlenme', value: `${filmTotals.watchMinutes} dk` },
              { label: 'Toplam izlenme sayısı', value: String(filmTotals.watchCount) },
              { label: 'Toplam beğeni', value: String(filmTotals.likes) },
              { label: 'Toplam izleyici', value: String(filmTotals.viewers) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-[#11141c] p-4">
                <p className="text-xs text-sineoda-muted">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  statusFilter === filter.id
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {filter.label}
              </button>
            ))}
            <select
              value={schoolFilter}
              onChange={(event) => setSchoolFilter(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#11141c] px-3 py-1.5 text-sm text-white"
            >
              <option value="all">Tüm okullar</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <AdminSearchBar value={filmsQuery} onChange={setFilmsQuery} placeholder="Film, okul, öğrenci veya e-posta ara..." />

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <span className="text-sm text-emerald-200">{selectedIds.length} seçili</span>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => void runBulkReview('published', 'approved')}
                className="rounded-lg bg-sineoda-gold px-3 py-1.5 text-xs font-semibold text-sineoda-bg disabled:opacity-60"
              >
                Toplu Yayınla
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => void runBulkReview('pending')}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80"
              >
                Toplu Yayından Al
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => void runBulkReview('rejected')}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300"
              >
                Toplu Reddet
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => void runBulkDelete()}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300"
              >
                Toplu Sil
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-lg px-3 py-1.5 text-xs text-sineoda-muted"
              >
                Seçimi Temizle
              </button>
            </div>
          )}

          {filteredFilms.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-sineoda-muted">
              Filtrelere uygun Genç Sinema içeriği yok.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#11141c] text-sineoda-muted">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        className="accent-emerald-400"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Film</th>
                    <th className="px-4 py-3 font-medium">Öğrenci</th>
                    <th className="px-4 py-3 font-medium">Okul</th>
                    <th className="px-4 py-3 font-medium">Tür</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Yayın tarihi</th>
                    <th className="px-4 py-3 font-medium">İzlenme</th>
                    <th className="px-4 py-3 font-medium">İzlenme sayısı</th>
                    <th className="px-4 py-3 font-medium">Beğeni</th>
                    <th className="px-4 py-3 font-medium min-w-[240px]">Yönetim</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFilms.map((item) => (
                    <tr key={item.id} className="border-t border-white/5">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="accent-emerald-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setDetailId(item.id)}
                          className="font-medium text-white hover:text-emerald-300"
                        >
                          {item.title}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sineoda-muted">
                        <p>{item.creatorName ?? '—'}</p>
                        {item.studioName ? <p className="text-xs">{item.studioName}</p> : null}
                      </td>
                      <td className="px-4 py-3 text-sineoda-muted">{item.schoolName ?? '—'}</td>
                      <td className="px-4 py-3 text-sineoda-muted">
                        {FORMAT_LABELS[item.contentFormat] ?? item.contentFormat}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${studentFilmStatusClass(item)}`}>
                          {studentFilmStatusLabel(item)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-sineoda-muted">
                        {formatPublishDate(item.publishedAt)}
                      </td>
                      <td className="px-4 py-3">{item.watchMinutes ?? 0} dk</td>
                      <td className="px-4 py-3">{item.watchCount ?? 0}</td>
                      <td className="px-4 py-3">{item.likes ?? 0}</td>
                      <td className="px-4 py-3 align-top">
                        <AdminStudentCinemaFilmActions
                          item={item}
                          onDetail={() => setDetailId(item.id)}
                          onChanged={() => void load()}
                          onError={setError}
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
          <AdminSearchBar value={queueQuery} onChange={setQueueQuery} placeholder="Başlık, okul veya öğrenci ara..." />
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
                        {item.creatorName ?? 'Öğrenci belirtilmemiş'} · {item.schoolName ?? 'Okul belirtilmemiş'}
                      </p>
                      <p className="mt-1 text-xs text-sineoda-muted">
                        {item.watchCount ?? 0} izlenme · {item.likes ?? 0} beğeni
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
                    <button
                      type="button"
                      onClick={() => setDetailId(item.id)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5"
                    >
                      Detay & Künye
                    </button>
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

      <AdminStudentCinemaDetailDrawer
        contentId={detailId}
        schools={schools}
        onClose={() => setDetailId(null)}
        onUpdated={() => void load()}
      />
    </div>
  )
}
