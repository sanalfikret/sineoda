import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAdminCreatorDetail,
  fetchAdminCreators,
  updateAdminCreatorStatus,
  type AdminCreator,
  type AdminCreatorContent,
  type AdminCreatorDetail,
} from '../../api/client'
import { AdminCreatorFilmEditor } from '../../components/admin/AdminCreatorFilmEditor'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { CREATOR_DOC_TYPES } from '../../constants/creatorLegal'
import { formatPublishDate } from '../../utils/publish'
import { fuzzySearchMatch, sortByTurkishTitle } from '../../utils/search'

const STATUS_LABELS: Record<AdminCreator['status'], string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  suspended: 'Askıya alındı',
}

const STATUS_CLASS: Record<AdminCreator['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-200',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300',
  suspended: 'bg-white/10 text-white/60',
}

const REVIEW_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'İncelemede',
  published: 'Yayında',
  rejected: 'Reddedildi',
}

const REVIEW_CLASS: Record<string, string> = {
  draft: 'bg-white/10 text-white/60',
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

export function AdminCreatorsPage() {
  const [creators, setCreators] = useState<AdminCreator[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminCreatorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editingContentId, setEditingContentId] = useState<string | null>(null)

  const loadCreators = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { creators: data } = await fetchAdminCreators()
      setCreators(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yapımcılar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

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
    try {
      await updateAdminCreatorStatus(id, status)
      await loadCreators()
      if (selectedId === id) await loadDetail(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Durum güncellenemedi.')
    }
  }

  const handleReviewSaved = async () => {
    await loadCreators()
    if (selectedId) await loadDetail(selectedId)
  }

  const selectedCreator = detail?.creator ?? creators.find((entry) => entry.id === selectedId) ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Yapımcılar</h1>
        <p className="mt-1 text-sm text-sineoda-muted">
          Creator hesapları, belgeler ve film listesi · {creators.length} kayıt
        </p>
      </div>

      <AdminSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Stüdyo, ad, e-posta veya durum ara..."
        resultCount={filteredCreators.length}
        totalCount={creators.length}
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]">
          {loading ? (
            <p className="p-6 text-sm text-sineoda-muted">Yükleniyor...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-sineoda-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Stüdyo</th>
                    <th className="px-4 py-3 font-medium">Kişi</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Film</th>
                    <th className="px-4 py-3 font-medium">Belge</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreators.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sineoda-muted">
                        Aramanızla eşleşen yapımcı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredCreators.map((creator) => (
                      <tr
                        key={creator.id}
                        onClick={() => setSelectedId(creator.id)}
                        className={`cursor-pointer border-b border-white/5 last:border-0 transition hover:bg-white/[0.03] ${
                          selectedId === creator.id ? 'bg-sineoda-gold/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-white">{creator.studioName}</td>
                        <td className="px-4 py-3">
                          <p className="text-white/90">{creator.name}</p>
                          <p className="text-xs text-sineoda-muted">{creator.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[creator.status]}`}
                          >
                            {STATUS_LABELS[creator.status]}
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
            <div className="flex min-h-[320px] items-center justify-center text-sm text-sineoda-muted">
              Detay görmek için listeden bir yapımcı seçin.
            </div>
          ) : detailLoading && !detail ? (
            <p className="text-sm text-sineoda-muted">Detay yükleniyor...</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedCreator.studioName}</h2>
                  <p className="mt-1 text-sm text-sineoda-muted">{selectedCreator.name}</p>
                </div>
                <select
                  value={selectedCreator.status}
                  onChange={(event) =>
                    void handleStatusChange(selectedCreator.id, event.target.value as AdminCreator['status'])
                  }
                  className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <section className="rounded-xl border border-white/5 bg-[#0d0f14] p-4">
                <h3 className="text-sm font-semibold text-white">Kişisel bilgiler</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-sineoda-muted">Ad Soyad</dt>
                    <dd className="text-white/90">{selectedCreator.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sineoda-muted">E-posta</dt>
                    <dd className="text-white/90">{selectedCreator.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sineoda-muted">Stüdyo / Yapım</dt>
                    <dd className="text-white/90">{selectedCreator.studioName}</dd>
                  </div>
                  <div>
                    <dt className="text-sineoda-muted">Kayıt tarihi</dt>
                    <dd className="text-white/90">
                      {new Date(selectedCreator.createdAt).toLocaleDateString('tr-TR')}
                    </dd>
                  </div>
                  {detail?.creator.bio && (
                    <div className="sm:col-span-2">
                      <dt className="text-sineoda-muted">Biyografi</dt>
                      <dd className="mt-1 text-white/80">{detail.creator.bio}</dd>
                    </div>
                  )}
                  {detail?.creator.legalAcceptedAt && (
                    <div className="sm:col-span-2">
                      <dt className="text-sineoda-muted">Yasal onay</dt>
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
                  <p className="mt-2 text-sm text-sineoda-muted">Henüz belge yüklenmemiş.</p>
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
                          className="text-sineoda-gold hover:underline"
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
                  <p className="mt-2 text-sm text-sineoda-muted">Henüz film gönderilmemiş.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {(detail?.content ?? []).map((item: AdminCreatorContent) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-white/5 bg-[#0d0f14] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{item.title}</p>
                            <p className="mt-1 text-xs text-sineoda-muted">
                              {item.type} · {item.year} · {item.duration || 'Süre belirtilmemiş'}
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
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sineoda-muted">
                          <span>İzlenme: {item.watchMinutes ?? 0} dk</span>
                          <span>Nitelikli: {item.qualifiedMinutes ?? 0} dk</span>
                          <span>İzleyici: {item.viewers ?? 0}</span>
                          <span>Beğeni: {item.likes ?? 0}</span>
                          {item.publishedAt && (
                            <span>Yayın: {formatPublishDate(item.publishedAt)}</span>
                          )}
                          {item.licenseExpiresAt && (
                            <span>
                              Telif: {new Date(item.licenseExpiresAt).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>
                        {item.sourceVideoUrl && (
                          <p className="mt-2 truncate text-xs text-sky-300/80" title={item.sourceVideoUrl}>
                            Kaynak: {item.sourceVideoUrl}
                          </p>
                        )}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setEditingContentId(item.id)}
                            className="rounded-lg bg-sineoda-gold/15 px-3 py-1.5 text-xs font-medium text-sineoda-gold hover:bg-sineoda-gold/25"
                          >
                            İncele ve düzenle
                          </button>
                        </div>
                      </div>
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
