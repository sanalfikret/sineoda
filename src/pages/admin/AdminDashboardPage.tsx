import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAnalyticsOverview,
  fetchWatchStats,
  resolveMediaUrl,
  type AnalyticsOverview,
  type WatchStat,
} from '../../api/client'
import { useContent } from '../../context/ContentContext'

export function AdminDashboardPage() {
  const { catalog, categories, featuredContent } = useContent()
  const [watchStats, setWatchStats] = useState<WatchStat[]>([])
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const loadStats = async () => {
    try {
      const [watchData, overviewData] = await Promise.all([
        fetchWatchStats(),
        fetchAnalyticsOverview(),
      ])
      setWatchStats(watchData.stats)
      setOverview(overviewData)
    } catch {
      setWatchStats([])
      setOverview(null)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    void loadStats()
    const interval = window.setInterval(() => {
      void loadStats()
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const filmCount = catalog.filter((item) => item.type === 'film').length
  const seriesCount = catalog.filter((item) => item.type === 'dizi').length

  const stats = [
    { label: 'Toplam İçerik', value: catalog.length },
    { label: 'Film', value: filmCount },
    { label: 'Dizi', value: seriesCount },
    { label: 'Kategori', value: categories.length },
  ]

  const liveStats = overview
    ? [
        { label: 'Bugün Ziyaret', value: overview.today.visits },
        { label: 'Benzersiz Ziyaretçi', value: overview.today.uniqueVisitors },
        { label: 'Şu An Online', value: overview.live.onlineNow },
        {
          label: 'Bugün İzlenen',
          value: `${overview.today.watchHours} sa / ${overview.today.watchMinutes} dk`,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-sineoda-muted">
          Canlı site istatistikleri · 30 saniyede bir güncellenir
        </p>
      </div>

      {!statsLoading && overview && (
        <section className="rounded-2xl border border-sineoda-gold/20 bg-gradient-to-br from-sineoda-gold/10 to-transparent p-5">
          <h2 className="font-semibold text-white">Canlı Özet</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {liveStats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-[#11141c]/80 p-4">
                <p className="text-sm text-sineoda-muted">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold text-sineoda-gold">{stat.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-sineoda-muted">
            Toplam izlenme: {overview.totals.watchHours} saat ({overview.totals.watchMinutes} dk) ·{' '}
            {overview.totals.activeSubscriptions} aktif abonelik · {overview.totals.users} kullanıcı
          </p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-[#11141c] p-5"
          >
            <p className="text-sm text-sineoda-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
        <h2 className="font-semibold text-white">İzleme İstatistikleri</h2>
        <p className="mt-1 text-sm text-sineoda-muted">
          Her içerik için toplam izlenen dakika ve ortalama ilerleme yüzdesi
        </p>

        {statsLoading ? (
          <p className="mt-4 text-sm text-sineoda-muted">Yükleniyor...</p>
        ) : watchStats.length === 0 ? (
          <p className="mt-4 text-sm text-sineoda-muted">Henüz izleme verisi yok.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-sineoda-muted">
                  <th className="pb-3 pr-4 font-medium">İçerik</th>
                  <th className="pb-3 pr-4 font-medium">Tür</th>
                  <th className="pb-3 pr-4 font-medium">Toplam dk</th>
                  <th className="pb-3 pr-4 font-medium">İzleyici</th>
                  <th className="pb-3 font-medium">Ort. ilerleme</th>
                </tr>
              </thead>
              <tbody>
                {watchStats.map((row) => (
                  <tr key={row.contentId} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-white">{row.title}</td>
                    <td className="py-3 pr-4 capitalize text-sineoda-muted">{row.type}</td>
                    <td className="py-3 pr-4 text-sineoda-gold">{row.totalWatchedMinutes} dk</td>
                    <td className="py-3 pr-4 text-white/80">{row.viewerCount}</td>
                    <td className="py-3 text-white/80">{row.avgProgressPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <h2 className="font-semibold text-white">Öne Çıkan İçerik</h2>
          {featuredContent ? (
            <div className="mt-4 flex gap-4">
              <img
                src={resolveMediaUrl(featuredContent.poster)}
                alt=""
                className="h-28 w-20 rounded-lg object-cover"
              />
              <div>
                <p className="font-medium text-white">{featuredContent.title}</p>
                <p className="mt-1 text-sm text-sineoda-muted capitalize">
                  {featuredContent.type} · {featuredContent.year}
                </p>
                <Link
                  to={`/admin/icerikler/${featuredContent.id}`}
                  className="mt-3 inline-block text-sm text-sineoda-gold hover:underline"
                >
                  Düzenle
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-sineoda-muted">Henüz öne çıkan içerik yok.</p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <h2 className="font-semibold text-white">Hızlı İşlemler</h2>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/admin/icerikler/yeni"
              className="rounded-lg bg-sineoda-gold/15 px-4 py-3 text-sm font-medium text-sineoda-gold hover:bg-sineoda-gold/20"
            >
              + Yeni film veya dizi ekle
            </Link>
            <Link
              to="/admin/kategoriler"
              className="rounded-lg bg-white/5 px-4 py-3 text-sm text-white/85 hover:bg-white/10"
            >
              Kategorileri yönet
            </Link>
            <Link
              to="/admin/icerikler"
              className="rounded-lg bg-white/5 px-4 py-3 text-sm text-white/85 hover:bg-white/10"
            >
              Tüm içerikleri görüntüle
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
