import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchAdminCreatorDetail,
  fetchAdminCreatorStats,
  fetchAdminCreators,
  publishAdminCreatorPendingFilms,
  reviewAdminCreatorContent,
  updateAdminCreatorStatus,
  type AdminCreator,
  type AdminCreatorContent,
  type AdminCreatorDetail,
  type AdminCreatorOverviewStats,
} from '../../api/client'
import { AdminCreatorFilmEditor } from '../../components/admin/AdminCreatorFilmEditor'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { CREATOR_DOC_TYPES } from '../../constants/creatorLegal'
import { getContentTypeLabel } from '../../constants/contentTypes'
import { formatPublishDate } from '../../utils/publish'
import { categorizeCreatorFilm } from '../../utils/creatorAdmin'
import { fuzzySearchMatch, sortByTurkishTitle } from '../../utils/search'

const STATUS_LABELS: Record<AdminCreator['status'], string> = {
  pending: 'Hesap: Onay bekliyor',
  approved: 'Hesap: Onaylandı (+ bekleyen filmler yayınlanır)',
  rejected: 'Hesap: Reddedildi',
  suspended: 'Hesap: Askıya alındı',
}

const STATUS_CLASS: Record<AdminCreator['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-200',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300',
  suspended: 'bg-white/10 text-white/60',
}

const REVIEW_LABELS: Record<string, string> = {
  draft: 'Taslak',
  payment_pending: 'Ödeme bekliyor',
  pending: 'İncelemede',
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

function reviewBadge(item: AdminCreatorContent) {
  if (item.reviewStatus === 'published' && item.isScheduled) {
    return `Planlandı · ${formatPublishDate(item.publishedAt)}`
  }
  if (item.reviewStatus === 'published' && item.isPublished) {
    return REVIEW_LABELS.published
  }
  return REVIEW_LABELS[item.reviewStatus] ?? item.reviewStatus
}

function docTypeLabel(value: string) {
  return CREATOR_DOC_TYPES.find((entry) => entry.value === value)?.label ?? value
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
  publishingId,
  reviewingId,
  onPublish,
  onReturnToReview,
  onReject,
  onEdit,
}: {
  item: AdminCreatorContent
  publishingId: string | null
  reviewingId: string | null
  onPublish: (contentId: string) => void
  onReturnToReview: (contentId: string) => void
  onReject: (contentId: string) => void
  onEdit: (contentId: string) => void
}) {
  const isPublished = item.reviewStatus === 'published' && item.isPublished
  const isScheduled = item.reviewStatus === 'published' && item.isScheduled
  const isRejected = item.reviewStatus === 'rejected'
  const isReview = item.reviewStatus === 'pending' || item.reviewStatus === 'payment_pending' || item.reviewStatus === 'draft'

  return (
    <div className="border-t border-white/5 p-4 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{item.title}</p>
          <p className="mt-1 text-xs text-plooy-muted">
            {getContentTypeLabel(item.type)} · {item.year} · {item.duration || 'Süre belirtilmemiş'}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            REVIEW_CLASS[item.reviewStatus] ?? 'bg-white/10 text-white/80'
          }`}
        >
          {reviewBadge(item)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-plooy-muted">
        <span>İzlenme: {item.watchMinutes ?? 0} dk</span>
        <span>Nitelikli: {item.qualifiedMinutes ?? 0} dk</span>
        <span>İzleyici: {item.viewers ?? 0}</span>
        <span>Beğeni: {item.likes ?? 0}</span>
        {item.publishedAt && <span>Yayın: {formatPublishDate(item.publishedAt)}</span>}
        {item.licenseExpiresAt && (
          <span>Telif: {new Date(item.licenseExpiresAt).toLocaleDateString('tr-TR')}</span>
        )}
      </div>
      {item.sourceVideoUrl && (
        <p className="mt-2 truncate text-xs text-sky-300/80" title={item.sourceVideoUrl}>
          Kaynak: {item.sourceVideoUrl}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {(isReview || isRejected) && (
          <button
            type="button"
            disabled={publishingId === item.id}
            onClick={() => onPublish(item.id)}
            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60"
          >
            {publishingId === item.id ? 'Yayınlanıyor...' : 'Yayınla'}
          </button>
        )}
        {(isPublished || isScheduled || isRejected) && (
          <button
            type="button"
            disabled={reviewingId === item.id}
            onClick={() => onReturnToReview(item.id)}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
          >
            {reviewingId === item.id ? '...' : 'İncelemeye Al'}
          </button>
        )}
        {!isRejected && (
          <button
            type="button"
            disabled={reviewingId === item.id}
            onClick={() => onReject(item.id)}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-60"
          >
            Reddet
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(item.id)}
          className="rounded-lg bg-plooy-gold/15 px-3 py-1.5 text-xs font-medium text-plooy-gold hover:bg-plooy-gold/25"
        >
          İncele ve düzenle
        </button>
      </div>
    </div>
  )
}

export function AdminCreatorsPage() {
  const [creators, setCreators] = useState<AdminCreator[]>([])
  const [overviewStats, setOverviewStats] = useState<AdminCreatorOverviewStats | null>(null)
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminCreatorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [editingContentId, setEditingContentId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [publishingAll, setPublishingAll] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [filmSections, setFilmSections] = useState({
    published: true,
    scheduled: false,
    review: true,
    rejected: false,
  })

  const loadCreators = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ creators: data }, statsRes] = await Promise.all([
        fetchAdminCreators(paymentFilter),
        fetchAdminCreatorStats(),
      ])
      setCreators(data)
      setOverviewStats(statsRes.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yapımcılar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [paymentFilter])

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
    if (selectedId) void loadDetail(selectedId)
    else setDetail(null)
  }, [selectedId, loadDetail])

  const filteredCreators = useMemo(() => {
    const searched = creators.filter((creator) =>
      fuzzySearchMatch(
        query,
        creator.name,
        creator.email,
        creator.studioName,
        STATUS_LABELS[creator.status],
      ),
    )
    return sortByTurkishTitle(searched, (creator) => creator.studioName)
  }, [creators, query])

  const handleStatusChange = async (id: string, status: AdminCreator['status']) => {
    setNotice('')
    setError('')
    setStatusUpdating(true)
    try {
      const result = await updateAdminCreatorStatus(id, status)
      if (result.publishedCount && result.publishedCount > 0) {
        setNotice(`${result.publishedCount} film yayına alındı.`)
      } else if (status === 'approved') {
        setNotice('Hesap onaylandı. Bekleyen film yoksa zaten yayında veya henüz başvuru gönderilmemiş.')
      } else if (status === 'pending') {
        setNotice('Hesap incelemeye alındı.')
      }
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

  const handlePublishFilm = async (contentId: string) => {
    setPublishingId(contentId)
    setError('')
    try {
      await reviewAdminCreatorContent(contentId, 'published', { publishNow: true })
      await handleReviewSaved()
      setNotice('Film yayına alındı.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Film yayınlanamadı.')
    } finally {
      setPublishingId(null)
    }
  }

  const handleReturnFilmToReview = async (contentId: string) => {
    setReviewingId(contentId)
    setError('')
    try {
      await reviewAdminCreatorContent(contentId, 'pending')
      await handleReviewSaved()
      setNotice('Film incelemeye alındı.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Film incelemeye alınamadı.')
    } finally {
      setReviewingId(null)
    }
  }

  const handleRejectFilm = async (contentId: string) => {
    if (!window.confirm('Bu film reddedilsin mi?')) return
    setReviewingId(contentId)
    setError('')
    try {
      await reviewAdminCreatorContent(contentId, 'rejected')
      await handleReviewSaved()
      setNotice('Film reddedildi.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Film reddedilemedi.')
    } finally {
      setReviewingId(null)
    }
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
      if (result.publishedCount > 0) {
        setNotice(`${result.publishedCount} film yayına alındı.`)
      } else {
        setNotice('Bekleyen film yok — zaten yayında veya red edilmiş.')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Yapımcılar</h1>
        <p className="mt-1 text-sm text-plooy-muted">
          Bağımsız yapımcı hesapları, belgeler ve film listesi · {creators.length} kayıt
        </p>
      </div>

      {overviewStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Yapımcı', value: String(overviewStats.creatorCount) },
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
        placeholder="Stüdyo, ad, e-posta veya durum ara..."
        resultCount={filteredCreators.length}
        totalCount={creators.length}
      />

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'Tümü'],
          ['unpaid', 'Ödeme yapmayanlar'],
          ['paid', 'Ödemesi tamam'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPaymentFilter(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              paymentFilter === id
                ? 'bg-plooy-gold/15 text-plooy-gold'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]">
          {loading ? (
            <p className="p-6 text-sm text-plooy-muted">Yükleniyor...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-plooy-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Stüdyo</th>
                    <th className="px-4 py-3 font-medium">Kişi</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Ödeme</th>
                    <th className="px-4 py-3 font-medium">Film</th>
                    <th className="px-4 py-3 font-medium">Belge</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-plooy-muted">
                        Aramanızla eşleşen yapımcı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredCreators.map((creator) => (
                      <tr
                        key={creator.id}
                        onClick={() => setSelectedId(creator.id)}
                        className={`cursor-pointer border-b border-white/5 last:border-0 transition hover:bg-white/[0.03] ${
                          selectedId === creator.id ? 'bg-plooy-gold/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-white">{creator.studioName}</td>
                        <td className="px-4 py-3">
                          <p className="text-white/90">{creator.name}</p>
                          <p className="text-xs text-plooy-muted">{creator.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[creator.status]}`}
                          >
                            {STATUS_LABELS[creator.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              creator.registrationPaid
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-sky-500/15 text-sky-200'
                            }`}
                          >
                            {creator.registrationPaid ? 'Ödendi' : 'Ödeme bekliyor'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/70">{creator.contentCount}</td>
                        <td className="px-4 py-3 text-white/70">{creator.documentCount}</td>
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
              Detay görmek için listeden bir yapımcı seçin.
            </div>
          ) : detailLoading && !detail ? (
            <p className="text-sm text-plooy-muted">Detay yükleniyor...</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedCreator.studioName}</h2>
                  <p className="mt-1 text-sm text-plooy-muted">{selectedCreator.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[selectedCreator.status]}`}
                  >
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
                    onChange={(event) =>
                      void handleStatusChange(selectedCreator.id, event.target.value as AdminCreator['status'])
                    }
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
              <p className="text-xs text-plooy-muted">
                <strong className="text-white/80">Hesap: Onaylandı</strong> seçildiğinde bekleyen tüm standart
                filmler otomatik yayına alınır. Tek film için yeşil <strong className="text-emerald-200">Yayınla</strong>{' '}
                veya inceleme ekranını kullanın.
              </p>

              {selectedCreator.status === 'approved' && pendingFilmCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <p className="text-sm text-amber-100">
                    {pendingFilmCount} film hâlâ <strong>İncelemede</strong>. Hesap onaylı; filmleri ayrıca
                    yayınlaman gerekiyor.
                  </p>
                  <button
                    type="button"
                    disabled={publishingAll}
                    onClick={() => void handlePublishAllPending(selectedCreator.id)}
                    className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {publishingAll ? 'Yayınlanıyor...' : `Bekleyen ${pendingFilmCount} filmi yayınla`}
                  </button>
                </div>
              )}

              <section className="rounded-xl border border-white/5 bg-[#0d0f14] p-4">
                <h3 className="text-sm font-semibold text-white">Kişisel bilgiler</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-plooy-muted">Ad Soyad</dt>
                    <dd className="text-white/90">{selectedCreator.name}</dd>
                  </div>
                  <div>
                    <dt className="text-plooy-muted">E-posta</dt>
                    <dd className="text-white/90">{selectedCreator.email}</dd>
                  </div>
                  <div>
                    <dt className="text-plooy-muted">Stüdyo / Yapım</dt>
                    <dd className="text-white/90">{selectedCreator.studioName}</dd>
                  </div>
                  <div>
                    <dt className="text-plooy-muted">Kayıt tarihi</dt>
                    <dd className="text-white/90">
                      {new Date(selectedCreator.createdAt).toLocaleDateString('tr-TR')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-plooy-muted">Başvuru ödemesi</dt>
                    <dd className="text-white/90">
                      {detail?.creator.registrationPaid ?? selectedCreator.registrationPaid ? (
                        <>
                          Ödendi
                          {(detail?.creator.registrationPaidAt ?? selectedCreator.registrationPaidAt) && (
                            <span className="block text-xs text-plooy-muted">
                              {new Date(
                                detail?.creator.registrationPaidAt ?? selectedCreator.registrationPaidAt!,
                              ).toLocaleString('tr-TR')}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-sky-200">
                          Ödeme bekliyor
                          {(detail?.creator.paymentPendingCount ?? selectedCreator.paymentPendingCount ?? 0) > 0 &&
                            ' · film gönderildi'}
                        </span>
                      )}
                    </dd>
                  </div>
                  {detail?.creator.bio && (
                    <div className="sm:col-span-2">
                      <dt className="text-plooy-muted">Biyografi</dt>
                      <dd className="mt-1 text-white/80">{detail.creator.bio}</dd>
                    </div>
                  )}
                  {detail?.creator.legalAcceptedAt && (
                    <div className="sm:col-span-2">
                      <dt className="text-plooy-muted">Yasal onay</dt>
                      <dd className="text-white/80">
                        {new Date(detail.creator.legalAcceptedAt).toLocaleString('tr-TR')}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-white">
                  Belgeler ({detail?.documents.length ?? selectedCreator.documentCount})
                </h3>
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
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-plooy-gold hover:underline"
                        >
                          Görüntüle
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-white">
                  Filmler ({detail?.content.length ?? selectedCreator.contentCount})
                </h3>
                {detail && detail.content.length === 0 ? (
                  <p className="mt-2 text-sm text-plooy-muted">Henüz film gönderilmemiş.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {([
                      ['published', 'Yayınlanan', filmGroups.published],
                      ['scheduled', 'Planlandı', filmGroups.scheduled],
                      ['review', 'İnceleme bekleyen', filmGroups.review],
                      ['rejected', 'Reddedilen', filmGroups.rejected],
                    ] as const).map(([key, title, items]) => (
                      <CollapsibleFilmGroup
                        key={key}
                        title={title}
                        count={items.length}
                        expanded={filmSections[key]}
                        onToggle={() => toggleFilmSection(key)}
                      >
                        {items.length === 0 ? (
                          <p className="border-t border-white/10 px-4 py-4 text-sm text-plooy-muted">
                            Bu bölümde film yok.
                          </p>
                        ) : (
                          items.map((item) => (
                            <CreatorFilmCard
                              key={item.id}
                              item={item}
                              publishingId={publishingId}
                              reviewingId={reviewingId}
                              onPublish={(contentId) => void handlePublishFilm(contentId)}
                              onReturnToReview={(contentId) => void handleReturnFilmToReview(contentId)}
                              onReject={(contentId) => void handleRejectFilm(contentId)}
                              onEdit={setEditingContentId}
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
        <AdminCreatorFilmEditor
          contentId={editingContentId}
          onClose={() => setEditingContentId(null)}
          onSaved={() => void handleReviewSaved()}
        />
      )}
    </div>
  )
}
