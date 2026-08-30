import { useEffect, useState } from 'react'
import { fetchProfileWatchStats, type ProfileWatchStats } from '../api/client'
import { formatWatchHours } from '../utils/profileAvatar'

interface ProfileWatchStatsPanelProps {
  profileId: string
  profileName: string
}

export function ProfileWatchStatsPanel({ profileId, profileName }: ProfileWatchStatsPanelProps) {
  const [stats, setStats] = useState<ProfileWatchStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    void fetchProfileWatchStats(profileId)
      .then((result) => {
        if (!cancelled) setStats(result)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'İstatistikler yüklenemedi.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [profileId])

  if (loading) {
    return <p className="text-sm text-plooy-muted">İzleme istatistikleri yükleniyor…</p>
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>
  }

  if (!stats) return null

  return (
    <div>
      <h3 className="font-medium">{profileName} · İzleme Özeti</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-plooy-gold/20 bg-plooy-gold/5 p-4">
          <p className="text-xs uppercase tracking-wide text-plooy-muted">Toplam izleme</p>
          <p className="mt-1 text-2xl font-semibold text-plooy-gold">
            {formatWatchHours(stats.totalSeconds)}
          </p>
          <p className="mt-1 text-sm text-plooy-muted">{stats.totalTitles} içerik</p>
        </div>
        {stats.byCategory.map((entry) => (
          <div key={entry.key} className="rounded-xl border border-white/10 bg-[#0d0f14] p-4">
            <p className="text-xs uppercase tracking-wide text-plooy-muted">{entry.label}</p>
            <p className="mt-1 text-xl font-semibold">{formatWatchHours(entry.totalSeconds)}</p>
            <p className="mt-1 text-sm text-plooy-muted">{entry.titlesWatched} içerik</p>
          </div>
        ))}
      </div>
      {stats.totalSeconds <= 0 && (
        <p className="mt-4 text-sm text-plooy-muted">
          Henüz izleme kaydı yok. Film veya dizi izlemeye başladığında burada görünecek.
        </p>
      )}
    </div>
  )
}
