import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  fetchAdminCreatorDetail,
  fetchAdminCreatorStats,
  fetchAdminCreators,
  publishAdminCreatorPendingFilms,
  resolveMediaUrl,
  reviewAdminCreatorContent,
  reviewAdminStudentCinemaContent,
  updateAdminCreatorStatus,
  type AdminCreator,
  type AdminCreatorContent,
  type AdminCreatorDetail,
  type AdminCreatorOverviewStats,
  type AdminCreatorProgramFilter,
} from '../../api/client'
import { AdminCreatorFilmEditor } from './AdminCreatorFilmEditor'
import { AdminSearchBar } from './AdminSearchBar'
import { BulkMembershipGiftBar, MembershipGiftForm, formatExpiry } from './AdminMembershipGift'
import { CREATOR_DOC_TYPES } from '../../constants/creatorLegal'
import { getContentTypeLabel } from '../../constants/contentTypes'
import { formatPublishDate } from '../../utils/publish'
import { categorizeCreatorFilm } from '../../utils/creatorAdmin'
import { fuzzySearchMatch, sortByTurkishTitle } from '../../utils/search'

const STATUS_LABELS: Record<AdminCreator['status'], string> = {
  pending: 'Hesap: Onay bekliyor',
  approved: 'Hesap: Onaylandı',
  rejected: 'Hesap: Reddedildi',
  suspended: 'Hesap: Askıya alındı',
}

const STATUS_CLASS: Record<AdminCreator['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-200',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300',
  suspended: 'bg-white/10 text-white/60',
}

const PROGRAM_LABELS: Record<string, string> = {
  standard: 'Bağımsız yapımcı',
  student_cinema: 'Genç Sinema',
}

const PROGRAM_CLASS: Record<string, string> = {
  standard: 'bg-plooy-gold/15 text-plooy-gold',
  student_cinema: 'bg-emerald-500/15 text-emerald-300',
}

const FORMAT_LABELS: Record<string, string> = {
  main: 'Ana film',
  bts: 'Kamera arkası',
  teacher_note: 'Hoca notu',
}

const SCHOOL_REVIEW_LABELS: Record<string, string> = {
  none: '',
  pending: 'Okul onayı bekliyor',
  approved: 'Okul onaylı',
  rejected: 'Okul reddetti',
}

const REVIEW_LABELS: Record<string, string> = {
  draft: 'Taslak',
  payment_pending: 'Ödeme bekliyor',
  pending: 'Yeni başvuru',
  under_review: 'İnceleniyor',
  on_hold: 'Bekletiliyor',
  approved: 'Onaylandı',
  published: 'Yayında',
  rejected: 'Reddedildi',
}

const REVIEW_CLASS: Record<string, string> = {
  draft: 'bg-white/10 text-white/60',
  payment_pending: 'bg-sky-500/15 text-sky-200',
  pending: 'bg-amber-500/15 text-amber-200',
  published: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300',
}

const APPLICATION_TYPE_LABELS: Record<string, string> = {
  individual: 'Bireysel öğrenci',
  school: 'Okul üzerinden',
}

function reviewBadge(item: AdminCreatorContent) {
  if (item.reviewStatus === 'published' && item.isScheduled) return 'Planlandı'
  if (item.reviewStatus === 'published' && item.isPublished) return REVIEW_LABELS.published
  return REVIEW_LABELS[item.reviewStatus] ?? item.reviewStatus
}

function docTypeLabel(value: string) {
  return CREATOR_DOC_TYPES.find((entry) => entry.value === value)?.label ?? value
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return `${first}${last}`.toLocaleUpperCase('tr-TR') || '•'
}

function CreatorAvatar({ creator, className = 'h-10 w-10 text-sm' }: { creator: Pick<AdminCreator, 'name' | 'photoUrl'>; className?: string }) {
  if (creator.photoUrl) {
    return (
      <div className={`shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#0d0f14] ${className}`}>
        <img src={resolveMediaUrl(creator.photoUrl)} alt={creator.name} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-plooy-gold/30 bg-plooy-gold/10 font-semibold text-plooy-gold ${className}`}
    >
      {initials(creator.name)}
    </div>
  )
}

function CollapsibleFilmGroup({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string
  count: number
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0f14]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        <span className="text-white/60">{expanded ? '▼' : '▶'}</span>
        <span className="font-semibold text-white">{title}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-plooy-muted">{count}</span>
      </button>
      {expanded && children}
    </section>
  )
}

function CreatorFilmCard({
  item,
  busyId,
  onPublish,
  onReturnToReview,
  onReject,
  onEdit,
}: {
  item: AdminCreatorContent
  busyId: string | null
  onPublish: (item: AdminCreatorContent) => void
  onReturnToReview: (item: AdminCreatorContent) => void
  onReject: (item: AdminCreatorContent) => void
  onEdit: (item: AdminCreatorContent) => void
}) {
  const isPublished = item.reviewStatus === 'published' && item.isPublished
  const isScheduled = item.reviewStatus === 'published' && item.isScheduled
  const isRejected = item.reviewStatus === 'rejected'
  const isReview = ['pending', 'payment_pending', 'draft', 'under_review', 'on_hold', 'approved'].includes(item.reviewStatus)
  const busy = busyId === item.id
  const isStudent = item.program === 'student_cinema'
  const schoolReview = isStudent ? SCHOOL_REVIEW_LABELS[item.schoolReviewStatus ?? 'none'] : ''

  return (
    <div className="border-t border-white/5 p-4 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{item.title}</p>
          <p className="mt-1 text-xs text-plooy-muted">
            {getContentTypeLabel(item.type)} · {item.year} · {item.duration || 'Süre belirtilmemiş'}
            {isStudent && item.contentFormat && item.contentFormat !== 'main' && (
              <>
                {' · '}
                {FORMAT_LABELS[item.contentFormat] ?? item.contentFormat}
                {item.parentTitle ? ` (${item.parentTitle})` : ''}
              </>
            )}
          </p>
          {schoolReview && <p className="mt-1 text-xs text-emerald-200/80">{schoolReview}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${REVIEW_CLASS[item.reviewStatus] ?? 'bg-white/10 text-white/80'}`}>
          {reviewBadge(item)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-plooy-muted">
        <span>İzlenme: {item.watchMinutes ?? 0} dk</span>
        <span>Nitelikli: {item.qualifiedMinutes ?? 0} dk</span>
        <span>İzleyici: {item.viewers ?? 0}</span>
        <span>Beğeni: {item.likes ?? 0}</span>
        {item.publishedAt && <span>Yayın: {formatPublishDate(item.publishedAt)}</span>}
        {item.licenseExpiresAt && <span>Telif: {new Date(item.licenseExpiresAt).toLocaleDateString('tr-TR')}</span>}
      </div>
      {item.reviewNote && isRejected && <p className="mt-2 text-xs text-red-300">Not: {item.reviewNote}</p>}
      {item.sourceVideoUrl && (
        <p className="mt-2 truncate text-xs text-sky-300/80" title={item.sourceVideoUrl}>
          Kaynak: {item.sourceVideoUrl}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {(isReview || isRejected) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPublish(item)}
            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60"
          >
            {busy ? '...' : 'Yayınla'}
          </button>
        )}
        {(isPublished || isScheduled || isRejected) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onReturnToReview(item)}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
          >
            {busy ? '...' : 'İncelemeye Al'}
          </button>
        )}
        {!isRejected && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onReject(item)}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-60"
          >
            Reddet
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="rounded-lg bg-plooy-gold/15 px-3 py-1.5 text-xs font-medium text-plooy-gold hover:bg-plooy-gold/25"
        >
          İncele ve düzenle
        </button>
      </div>
    </div>
  )
}

interface AdminCreatorDirectoryProps {
  /** Sabit program (Genç Sinema sekmesi) veya 'all' ile program filtresi gösterilir. */
  program: AdminCreatorProgramFilter
  title?: string
  description?: string
  onCountChange?: (count: number) => void
}

/** Yapımcı / öğrenci dizini — her iki program için aynı sütunlar, alfabetik sıra, kişi detayı ve filmler. */
export function AdminCreatorDirectory({ program: fixedProgram, title, description, onCountChange }: AdminCreatorDirectoryProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [creators, setCreators] = useState<AdminCreator[]>([])
  const [overviewStats, setOverviewStats] = useState<AdminCreatorOverviewStats | null>(null)
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [programFilter, setProgramFilter] = useState<AdminCreatorProgramFilter>(fixedProgram)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminCreatorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [editingContentId, setEditingContentId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const toggleSelectedUser = (userId: string) =>
    setSelectedUserIds((current) => (current.includes(userId) ? current.filter((entry) => entry !== userId) : [...current, userId]))
  const [publishingAll, setPublishingAll] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [filmSections, setFilmSections] = useState({
    published: true,
    scheduled: false,
    review: true,
    rejected: false,
  })

  const showProgramFilter = fixedProgram === 'all'
  const activeProgram = showProgramFilter ? programFilter : fixedProgram

  const loadCreators = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ creators: data }, statsRes] = await Promise.all([
        fetchAdminCreators(paymentFilter, activeProgram),
        fetchAdminCreatorStats(activeProgram),
      ])
      setCreators(data)
      setOverviewStats(statsRes.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yapımcılar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [paymentFilter, activeProgram])

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setError('')
    try {
      const data = await fetchAdminCreatorDetail(id)
      setDetail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yapımcı detayı yüklenemedi.')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCreators()
  }, [loadCreators])

  useEffect(() => {
    onCountChange?.(creators.length)
  }, [creators.length, onCountChange])

  // Mesajlar sayfasından "Profili aç" ile gelindiğinde (?user=<userId>) kişiyi otomatik seç.
  useEffect(() => {
    const userId = searchParams.get('user')
    if (!userId || creators.length === 0) return
    const match = creators.find((creator) => creator.userId === userId)
    if (match) {
      setSelectedId(match.id)
      const next = new URLSearchParams(searchParams)
      next.delete('user')
      setSearchParams(next, { replace: true })
    }
  }, [creators, searchParams, setSearchParams])

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId)
    else setDetail(null)
  }, [selectedId, loadDetail])

  const filteredCreators = useMemo(() => {
    const searched = creators.filter((creator) =>
      fuzzySearchMatch(
        query,
        creator.name,
        creator.email,
        creator.phone ?? '',
        creator.studioName,
        creator.schoolName ?? '',
        creator.studentUniversity ?? '',
        STATUS_LABELS[creator.status],
        PROGRAM_LABELS[creator.program ?? 'standard'],
      ),
    )
    return sortByTurkishTitle(searched, (creator) => creator.name)
  }, [creators, query])

  const handleStatusChange = async (id: string, status: AdminCreator['status']) => {
    setNotice('')
    setError('')
    setStatusUpdating(true)
    try {
      await updateAdminCreatorStatus(id, status)
      if (status === 'approved') setNotice('Hesap onaylandı. Film inceleme ve yayın işlemlerini ayrıca yapabilirsiniz.')
      else if (status === 'pending') setNotice('Hesap incelemeye alındı.')
      await loadCreators()
      if (selectedId === id) await loadDetail(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Durum güncellenemedi.')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleReviewSaved = async () => {
    await loadCreators()
    if (selectedId) await loadDetail(selectedId)
  }

  const reviewFilm = async (
    item: AdminCreatorContent,
    reviewStatus: 'published' | 'rejected' | 'pending',
    successMessage: string,
  ) => {
    setBusyId(item.id)
    setError('')
    setNotice('')
    try {
      if (item.program === 'student_cinema') {
        await reviewAdminStudentCinemaContent(item.id, reviewStatus, reviewStatus === 'published' ? { publishNow: true } : undefined)
      } else {
        await reviewAdminCreatorContent(item.id, reviewStatus, reviewStatus === 'published' ? { publishNow: true } : undefined)
      }
      await handleReviewSaved()
      setNotice(successMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız.')
    } finally {
      setBusyId(null)
    }
  }

  const handleEditFilm = (item: AdminCreatorContent) => {
    if (item.program === 'student_cinema') navigate(`/admin/genc-sinema/${item.id}`)
    else setEditingContentId(item.id)
  }

  const filmGroups = useMemo(() => {
    const items = detail?.content ?? []
    return {
      published: items.filter((item) => categorizeCreatorFilm(item) === 'published'),
      scheduled: items.filter((item) => categorizeCreatorFilm(item) === 'scheduled'),
      review: items.filter((item) => categorizeCreatorFilm(item) === 'review'),
      rejected: items.filter((item) => categorizeCreatorFilm(item) === 'rejected'),
    }
  }, [detail?.content])

  const toggleFilmSection = (key: keyof typeof filmSections) => {
    setFilmSections((current) => ({ ...current, [key]: !current[key] }))
  }

  const pendingFilmCount = useMemo(
    () => (detail?.content ?? []).filter((item) => item.reviewStatus === 'pending').length,
    [detail?.content],
  )

  const handlePublishAllPending = async (creatorId: string) => {
    setPublishingAll(true)
    setNotice('')
    setError('')
    try {
      const result = await publishAdminCreatorPendingFilms(creatorId)
      const skipped = result.skipped ?? []
      setNotice(result.publishedCount > 0 ? `${result.publishedCount} film yayına alındı.` : 'Yayına alınan film yok.')
      if (skipped.length > 0) {
        setError(
          `${skipped.length} film atlandı: ` +
            skipped.map((entry) => `${entry.title} (${entry.reason})`).join(' · '),
        )
      }
      await loadCreators()
      await loadDetail(creatorId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filmler yayınlanamadı.')
    } finally {
      setPublishingAll(false)
    }
  }

  const selectedCreator = detail?.creator ?? creators.find((entry) => entry.id === selectedId) ?? null
  const isStudentSelected = selectedCreator?.program === 'student_cinema'

  return (
    <div className="space-y-6">
      {(title || description) && (
        <div>
          {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
          {description && (
            <p className="mt-1 text-sm text-plooy-muted">
              {description} · {creators.length} kayıt
            </p>
          )}
        </div>
      )}

      {overviewStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: activeProgram === 'student_cinema' ? 'Öğrenci' : 'Yapımcı', value: String(overviewStats.creatorCount) },
            { label: 'Toplam izlenme', value: `${overviewStats.watchMinutes} dk` },
            { label: 'İzlenme sayısı', value: String(overviewStats.watchCount) },
            { label: 'Toplam izleyici', value: String(overviewStats.viewers) },
            { label: 'Toplam beğeni', value: String(overviewStats.likes) },
            { label: 'Yayında film', value: String(overviewStats.publishedCount) },
            { label: 'İncelemede film', value: String(overviewStats.pendingCount) },
            { label: 'Ödeme bekleyen film', value: String(overviewStats.paymentPendingCount) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <AdminSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Ad, e-posta, telefon, şirket, okul veya durum ara..."
        resultCount={filteredCreators.length}
        totalCount={creators.length}
      />

      <div className="flex flex-wrap items-center gap-2">
        {showProgramFilter &&
          (
            [
              ['all', 'Tüm programlar'],
              ['standard', 'Bağımsız yapımcı'],
              ['student_cinema', 'Genç Sinema'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setProgramFilter(id)
                setSelectedId(null)
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                programFilter === id ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        {showProgramFilter && <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />}
        {(
          [
            ['all', 'Tümü'],
            ['unpaid', 'Ödeme yapmayanlar'],
            ['paid', 'Ödemesi tamam'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPaymentFilter(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              paymentFilter === id ? 'bg-plooy-gold/15 text-plooy-gold' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>
      )}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <BulkMembershipGiftBar
        audiences={
          activeProgram === 'student_cinema'
            ? [{ id: 'creators_student', label: 'Tüm Genç Sinema öğrencileri' }]
            : activeProgram === 'standard'
              ? [{ id: 'creators_standard', label: 'Tüm bağımsız yapımcılar' }]
              : [
                  { id: 'creators_all', label: 'Tüm yapımcılar (bağımsız + Genç Sinema)' },
                  { id: 'creators_standard', label: 'Sadece bağımsız yapımcılar' },
                  { id: 'creators_student', label: 'Sadece Genç Sinema öğrencileri' },
                ]
        }
        selectedIds={selectedUserIds}
        onClearSelection={() => setSelectedUserIds([])}
        onDone={async () => {
          await loadCreators()
          if (selectedId) await loadDetail(selectedId)
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]">
          {loading ? (
            <p className="p-6 text-sm text-plooy-muted">Yükleniyor...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-plooy-muted">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Tümünü seç"
                        checked={filteredCreators.length > 0 && filteredCreators.every((creator) => selectedUserIds.includes(creator.userId))}
                        onChange={() => {
                          const ids = filteredCreators.map((creator) => creator.userId)
                          const all = ids.every((id) => selectedUserIds.includes(id))
                          setSelectedUserIds((current) => (all ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]))
                        }}
                        className="accent-plooy-gold"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Kişi</th>
                    <th className="px-4 py-3 font-medium">Şirket / Okul</th>
                    {showProgramFilter && <th className="px-4 py-3 font-medium">Program</th>}
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Ödeme</th>
                    <th className="px-4 py-3 font-medium">Film</th>
                    <th className="px-4 py-3 font-medium">Belge</th>
                    <th className="px-4 py-3 font-medium">Mesaj</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreators.length === 0 ? (
                    <tr>
                      <td colSpan={showProgramFilter ? 9 : 8} className="px-4 py-10 text-center text-plooy-muted">
                        Aramanızla eşleşen kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredCreators.map((creator) => (
                      <tr
                        key={creator.id}
                        onClick={() => setSelectedId(creator.id)}
                        className={`cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.03] ${
                          selectedId === creator.id ? 'bg-plooy-gold/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`${creator.name} seç`}
                            checked={selectedUserIds.includes(creator.userId)}
                            onChange={() => toggleSelectedUser(creator.userId)}
                            className="accent-plooy-gold"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <CreatorAvatar creator={creator} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">{creator.name}</p>
                              <p className="truncate text-xs text-plooy-muted">{creator.email}</p>
                              {creator.phone && <p className="truncate text-xs text-plooy-muted">{creator.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white/90">{creator.studioName}</p>
                          {creator.program === 'student_cinema' && (
                            <p className="text-xs text-plooy-muted">
                              {creator.studentUniversity || creator.schoolName || '—'}
                              {creator.studentDepartment ? ` · ${creator.studentDepartment}` : ''}
                            </p>
                          )}
                        </td>
                        {showProgramFilter && (
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PROGRAM_CLASS[creator.program ?? 'standard']}`}>
                              {PROGRAM_LABELS[creator.program ?? 'standard']}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[creator.status]}`}>
                            {STATUS_LABELS[creator.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                              creator.registrationPaid ? 'bg-emerald-500/15 text-emerald-300' : 'bg-sky-500/15 text-sky-200'
                            }`}
                          >
                            {creator.registrationPaid ? 'Üyelik aktif' : 'Üyelik yok'}
                          </span>
                          {creator.subscriptionExpiresAt && (
                            <span className="mt-1 block text-xs text-plooy-muted">
                              Bitiş: {new Date(creator.subscriptionExpiresAt).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/70">{creator.contentCount}</td>
                        <td className="px-4 py-3 text-white/70">{creator.documentCount}</td>
                        <td className="px-4 py-3">
                          {creator.unreadMessages ? (
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-black">{creator.unreadMessages}</span>
                          ) : (
                            <span className="text-plooy-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
          {!selectedCreator ? (
            <div className="flex min-h-[320px] items-center justify-center text-sm text-plooy-muted">
              Detay görmek için listeden bir kişi seçin.
            </div>
          ) : detailLoading && !detail ? (
            <p className="text-sm text-plooy-muted">Detay yükleniyor...</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CreatorAvatar creator={selectedCreator} className="h-16 w-16 text-lg" />
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedCreator.name}</h2>
                    <p className="text-sm text-plooy-gold">{selectedCreator.studioName}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${PROGRAM_CLASS[selectedCreator.program ?? 'standard']}`}>
                      {PROGRAM_LABELS[selectedCreator.program ?? 'standard']}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[selectedCreator.status]}`}>
                    {STATUS_LABELS[selectedCreator.status]}
                  </span>
                  {selectedCreator.status !== 'approved' && (
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => void handleStatusChange(selectedCreator.id, 'approved')}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {statusUpdating ? '...' : 'Onayla'}
                    </button>
                  )}
                  {selectedCreator.status !== 'pending' && (
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => void handleStatusChange(selectedCreator.id, 'pending')}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                    >
                      {statusUpdating ? '...' : 'İncelemeye Al'}
                    </button>
                  )}
                  <select
                    value={selectedCreator.status}
                    onChange={(event) => void handleStatusChange(selectedCreator.id, event.target.value as AdminCreator['status'])}
                    className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                    aria-label="Diğer hesap durumları"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/admin/mesajlar?user=${encodeURIComponent(selectedCreator.userId)}`}
                  className="rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 px-3 py-1.5 text-xs font-semibold text-plooy-gold hover:bg-plooy-gold/20"
                >
                  Mesaj gönder / sohbeti aç
                  {selectedCreator.unreadMessages ? ` (${selectedCreator.unreadMessages} okunmamış)` : ''}
                </Link>
                {!isStudentSelected && selectedCreator.status === 'approved' && pendingFilmCount > 0 && (
                  <button
                    type="button"
                    disabled={publishingAll}
                    onClick={() => void handlePublishAllPending(selectedCreator.id)}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {publishingAll ? 'Yayınlanıyor...' : `Bekleyen ${pendingFilmCount} filmi yayınla`}
                  </button>
                )}
              </div>

              <section className="rounded-xl border border-white/5 bg-[#0d0f14] p-4">
                <h3 className="text-sm font-semibold text-white">Kişisel bilgiler</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-plooy-muted">Ad</dt>
                    <dd className="text-white/90">{selectedCreator.firstName || selectedCreator.name}</dd>
                  </div>
                  <div>
                    <dt className="text-plooy-muted">Soyad</dt>
                    <dd className="text-white/90">{selectedCreator.lastName || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-plooy-muted">E-posta</dt>
                    <dd className="break-all text-white/90">{selectedCreator.email}</dd>
                  </div>
                  <div>
                    <dt className="text-plooy-muted">Telefon</dt>
                    <dd className="text-white/90">{selectedCreator.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-plooy-muted">Şirket / Yapım</dt>
                    <dd className="text-white/90">{selectedCreator.studioName}</dd>
                  </div>
                  <div>
                    <dt className="text-plooy-muted">Kayıt tarihi</dt>
                    <dd className="text-white/90">{new Date(selectedCreator.createdAt).toLocaleDateString('tr-TR')}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-plooy-muted">Ödeme hesabı (IBAN)</dt>
                    <dd className="text-white/90">
                      {selectedCreator.payout?.iban ? (
                        <>
                          <span className="font-mono">{selectedCreator.payout.iban.replace(/(.{4})/g, '$1 ').trim()}</span>
                          {selectedCreator.payout.holder && <span> · {selectedCreator.payout.holder}</span>}
                          {selectedCreator.payout.taxId && (
                            <span className="block text-xs text-plooy-muted">
                              Vergi/TC no: {selectedCreator.payout.taxId}
                              {selectedCreator.payout.taxOffice ? ` · ${selectedCreator.payout.taxOffice}` : ''}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-amber-300">Girilmemiş — yapımcı panelden ekler</span>
                      )}
                    </dd>
                  </div>
                  {isStudentSelected && (
                    <>
                      <div>
                        <dt className="text-plooy-muted">Başvuru türü</dt>
                        <dd className="text-white/90">
                          {APPLICATION_TYPE_LABELS[selectedCreator.studentApplicationType ?? ''] ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-plooy-muted">Okul</dt>
                        <dd className="text-white/90">{selectedCreator.studentUniversity || selectedCreator.schoolName || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-plooy-muted">Bölüm</dt>
                        <dd className="text-white/90">{selectedCreator.studentDepartment || '—'}</dd>
                      </div>
                      {selectedCreator.projectCrew && (
                        <div className="sm:col-span-2">
                          <dt className="text-plooy-muted">Yönetmen ve yapım ekibi</dt>
                          <dd className="whitespace-pre-wrap text-white/80">{selectedCreator.projectCrew}</dd>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <dt className="text-plooy-muted">Aylık yapımcı üyeliği</dt>
                    <dd className="text-white/90">
                      {selectedCreator.registrationPaid ? (
                        <>
                          <span className="text-emerald-300">Aktif</span>
                          <span className="block text-xs text-plooy-muted">
                            Bitiş: {formatExpiry(selectedCreator.subscriptionExpiresAt)}
                            {selectedCreator.registrationPaidAt && ` · ilk ödeme ${new Date(selectedCreator.registrationPaidAt).toLocaleDateString('tr-TR')}`}
                          </span>
                        </>
                      ) : (
                        <span className="text-sky-200">
                          Üyelik yok / süresi dolmuş
                          {selectedCreator.subscriptionExpiresAt && ` (${formatExpiry(selectedCreator.subscriptionExpiresAt)})`}
                          {(selectedCreator.paymentPendingCount ?? 0) > 0 && ' · ödeme bekleyen film var'}
                        </span>
                      )}
                    </dd>
                  </div>
                  {selectedCreator.bio && (
                    <div className="sm:col-span-2">
                      <dt className="text-plooy-muted">Tanıtım</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-white/80">{selectedCreator.bio}</dd>
                    </div>
                  )}
                  {selectedCreator.legalAcceptedAt && (
                    <div className="sm:col-span-2">
                      <dt className="text-plooy-muted">Yasal onay</dt>
                      <dd className="text-white/80">{new Date(selectedCreator.legalAcceptedAt).toLocaleString('tr-TR')}</dd>
                    </div>
                  )}
                </dl>
              </section>

              <MembershipGiftForm
                userId={selectedCreator.userId}
                currentExpiresAt={selectedCreator.subscriptionExpiresAt ?? null}
                currentStatus={selectedCreator.registrationPaid ? 'active' : null}
                onGranted={async () => {
                  await loadCreators()
                  await loadDetail(selectedCreator.id)
                }}
              />

              <section>
                <h3 className="text-sm font-semibold text-white">Belgeler ({detail?.documents.length ?? selectedCreator.documentCount})</h3>
                {detail && detail.documents.length === 0 ? (
                  <p className="mt-2 text-sm text-plooy-muted">Henüz belge yüklenmemiş.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {(detail?.documents ?? []).map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#0d0f14] px-3 py-2 text-sm"
                      >
                        <span className="text-white/80">{docTypeLabel(doc.docType)}</span>
                        <a href={resolveMediaUrl(doc.fileUrl)} target="_blank" rel="noreferrer" className="text-plooy-gold hover:underline">
                          Görüntüle
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-white">Filmler ({detail?.content.length ?? selectedCreator.contentCount})</h3>
                {detail && detail.content.length === 0 ? (
                  <p className="mt-2 text-sm text-plooy-muted">Henüz film gönderilmemiş.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {(
                      [
                        ['published', 'Yayınlanan', filmGroups.published],
                        ['scheduled', 'Planlandı', filmGroups.scheduled],
                        ['review', 'İnceleme bekleyen', filmGroups.review],
                        ['rejected', 'Reddedilen', filmGroups.rejected],
                      ] as const
                    ).map(([key, groupTitle, items]) => (
                      <CollapsibleFilmGroup
                        key={key}
                        title={groupTitle}
                        count={items.length}
                        expanded={filmSections[key]}
                        onToggle={() => toggleFilmSection(key)}
                      >
                        {items.length === 0 ? (
                          <p className="border-t border-white/10 px-4 py-4 text-sm text-plooy-muted">Bu bölümde film yok.</p>
                        ) : (
                          items.map((item) => (
                            <CreatorFilmCard
                              key={item.id}
                              item={item}
                              busyId={busyId}
                              onPublish={(film) => void reviewFilm(film, 'published', 'Film yayına alındı.')}
                              onReturnToReview={(film) => void reviewFilm(film, 'pending', 'Film incelemeye alındı.')}
                              onReject={(film) => {
                                if (window.confirm('Bu film reddedilsin mi?')) void reviewFilm(film, 'rejected', 'Film reddedildi.')
                              }}
                              onEdit={handleEditFilm}
                            />
                          ))
                        )}
                      </CollapsibleFilmGroup>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {editingContentId && (
        <AdminCreatorFilmEditor contentId={editingContentId} onClose={() => setEditingContentId(null)} onSaved={() => void handleReviewSaved()} />
      )}
    </div>
  )
}
