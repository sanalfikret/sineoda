import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminCatalog, resolveMediaUrl } from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { ADMIN_NEW_VERTICAL_HREF } from '../../components/admin/AdminContentActions'
import { useContent } from '../../context/ContentContext'
import { CONTENT_TYPES, getContentDisplayLabel } from '../../constants/contentTypes'
import { useAdminAnalytics } from '../../hooks/useAdminAnalytics'
import type { AdminContentItem, ContentType } from '../../types/content'
import { formatLicenseDate, mergeAdminCatalog } from '../../utils/license'
import { formatPublishDate } from '../../utils/publish'
import { isVerticalContent } from '../../utils/vertical'
import { fuzzySearchMatch } from '../../utils/search'

type TypeFilter = 'all' | ContentType | 'dikey' | 'expiring'

function PublishStatusBadge({ item }: { item: AdminContentItem }) {
  if (item.isScheduled) {
    return (
      <span className="rounded-full bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-300">
        Planlandı · {formatPublishDate(item.publishedAt)}
      </span>
    )
  }

  if (!item.isPublished) {
    return (
      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">Yayınlanmadı</span>
    )
  }

  return (
    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
      Yayında
    </span>
  )
}

function LicenseStatusBadge({ item }: { item: AdminContentItem }) {
  if (item.licenseUnlimited) {
    return (
      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">Sınırsız</span>
    )
  }

  if (item.licenseExpired) {
    return (
      <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-medium text-red-300">
        Süresi doldu
      </span>
    )
  }

  if (item.licenseExpiringSoon) {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-300">
        {item.licenseDaysRemaining} gün kaldı
      </span>
    )
  }

  return (
    <span className="text-xs text-white/70">{formatLicenseDate(item.licenseExpiresAt)}</span>
  )
}

function sortAdminItems(items: AdminContentItem[]) {
  return [...items].sort((a, b) => {
    const rank = (item: AdminContentItem) => {
      if (item.licenseExpired) return 0
      if (item.licenseExpiringSoon) return 1
      return 2
    }
    const rankDiff = rank(a) - rank(b)
    if (rankDiff !== 0) return rankDiff

    const aDays = a.licenseDaysRemaining
    const bDays = b.licenseDaysRemaining
    if (aDays !== null && bDays !== null && aDays !== bDays) return aDays - bDays

    return a.title.localeCompare(b.title, 'tr')
  })
}

export function AdminContentListPage() {
  const { catalog, deleteContent, setFeatured, isLoading: catalogLoading } = useContent()
  const { watchStatsById } = useAdminAnalytics(0)
  const [adminCatalog, setAdminCatalog] = useState<AdminContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const loadCatalog = async (sourceCatalog = catalog) => {
    setLoading(true)
    try {
      const { catalog: adminItems } = await fetchAdminCatalog()
      setAdminCatalog(mergeAdminCatalog(sourceCatalog, adminItems))
      setUsingFallback(false)
    } catch {
      setAdminCatalog(mergeAdminCatalog(sourceCatalog, []))
      setUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (catalogLoading) return
    void loadCatalog(catalog)
  }, [catalog, catalogLoading])

  const verticalCount = useMemo(() => adminCatalog.filter(isVerticalContent).length, [adminCatalog])
  const expiringCount = useMemo(
    () => adminCatalog.filter((item) => item.licenseExpiringSoon).length,
    [adminCatalog],
  )

  const filteredItems = useMemo(() => {
    const searched = adminCatalog.filter((item) => {
      if (typeFilter === 'expiring') {
        if (!item.licenseExpiringSoon && !item.licenseExpired) return false
      } else if (typeFilter === 'dikey') {
        if (!isVerticalContent(item)) return false
      } else if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false
      }
      return fuzzySearchMatch(query, item.title, item.id, item.genres.join(' '))
    })
    return sortAdminItems(searched)
  }, [adminCatalog, query, typeFilter])

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" içeriğini silmek istediğine emin misin?`)) return
    try {
      await deleteContent(id)
      await loadCatalog()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme başarısız.')
    }
  }

  const handleFeatured = async (id: string) => {
    await setFeatured(id)
    await loadCatalog()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">İçerikler</h1>
        <p className="mt-1 text-sm text-plooy-muted">
          Telif uyarıları önce · {adminCatalog.length} kayıt
          {verticalCount > 0 && ` · ${verticalCount} dikey dizi`}
          {expiringCount > 0 && ` · ${expiringCount} telif bitiyor`}
        </p>
      </div>

      {expiringCount > 0 && typeFilter !== 'expiring' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <strong>{expiringCount} içeriğin</strong> telif süresi önümüzdeki 30 gün içinde bitiyor.{' '}
          <button
            type="button"
            onClick={() => setTypeFilter('expiring')}
            className="font-semibold text-amber-300 underline underline-offset-2 hover:text-white"
          >
            Listeyi göster
          </button>
        </div>
      )}

      {usingFallback && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-plooy-muted">
          Telif bilgileri henüz API&apos;den yüklenemedi; içerik listesi site kataloğundan gösteriliyor.
          Telif tarihlerini kaydetmek için API&apos;yi güncelleyin.
        </div>
      )}

      <AdminSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Film veya dizi ara... (ör. kap krg → Kalp Kırığı)"
        resultCount={filteredItems.length}
        totalCount={adminCatalog.length}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            typeFilter === 'all'
              ? 'bg-plooy-gold text-plooy-bg'
              : 'bg-white/10 text-white/85 hover:bg-white/15'
          }`}
        >
          Tümü
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter('expiring')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            typeFilter === 'expiring'
              ? 'bg-amber-500 text-plooy-bg'
              : 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
          }`}
        >
          Telif Bitiyor
          {expiringCount > 0 && (
            <span className="ml-1.5 text-xs opacity-90">({expiringCount})</span>
          )}
        </button>
        {CONTENT_TYPES.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setTypeFilter(entry.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              typeFilter === entry.value
                ? 'bg-plooy-gold text-plooy-bg'
                : 'bg-white/10 text-white/85 hover:bg-white/15'
            }`}
          >
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTypeFilter('dikey')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            typeFilter === 'dikey'
              ? 'bg-plooy-gold text-plooy-bg'
              : 'bg-white/10 text-white/85 hover:bg-white/15'
          }`}
        >
          Dikey Dizi
          {verticalCount > 0 && (
            <span className="ml-1.5 text-xs opacity-80">({verticalCount})</span>
          )}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-plooy-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Poster</th>
                <th className="px-4 py-3 font-medium">Başlık</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Eklenme</th>
                <th className="px-4 py-3 font-medium">Yayın</th>
                <th className="px-4 py-3 font-medium">Telif</th>
                <th className="px-4 py-3 font-medium">İzlenen</th>
                <th className="px-4 py-3 font-medium">Öne Çıkan</th>
                <th className="px-4 py-3 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading || catalogLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-plooy-muted">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-plooy-muted">
                    {typeFilter === 'dikey' ? (
                      <div className="space-y-3">
                        <p>Henüz dikey dizi eklenmemiş.</p>
                        <Link
                          to={ADMIN_NEW_VERTICAL_HREF}
                          className="inline-flex rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg"
                        >
                          + İlk Dikey Diziyi Ekle
                        </Link>
                      </div>
                    ) : typeFilter === 'expiring' ? (
                      'Önümüzdeki 30 gün içinde bitecek telif bulunamadı.'
                    ) : (
                      'Aramanızla eşleşen içerik bulunamadı.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const watchedMinutes = watchStatsById.get(item.id)?.totalWatchedMinutes
                  return (
                  <tr
                    key={item.id}
                    className={`border-b border-white/5 last:border-0 ${
                      item.licenseExpiringSoon || item.licenseExpired ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <img
                        src={resolveMediaUrl(item.poster)}
                        alt=""
                        className={`rounded object-cover ${
                          isVerticalContent(item) ? 'h-16 w-9' : 'h-14 w-10'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-xs text-plooy-muted">{item.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          isVerticalContent(item)
                            ? 'rounded-full bg-plooy-gold/15 px-2 py-1 text-xs font-medium text-plooy-gold'
                            : 'text-white/80'
                        }
                      >
                        {getContentDisplayLabel(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/70">
                      {formatLicenseDate(item.contentAddedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <PublishStatusBadge item={item} />
                    </td>
                    <td className="px-4 py-3">
                      <LicenseStatusBadge item={item} />
                    </td>
                    <td className="px-4 py-3 text-xs text-white/80">
                      {watchedMinutes ? `${watchedMinutes} dk` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.featured ? (
                        <span className="rounded-full bg-plooy-gold/15 px-2 py-1 text-xs text-plooy-gold">
                          Evet
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleFeatured(item.id)}
                          className="text-xs text-plooy-muted hover:text-white"
                        >
                          Öne çıkar
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/icerikler/${item.id}`}
                          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                        >
                          Düzenle
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id, item.title)}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                        >
                          Sil
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
      </div>
    </div>
  )
}
