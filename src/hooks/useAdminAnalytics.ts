import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAnalyticsOverview,
  fetchWatchStats,
  type AnalyticsOverview,
  type WatchStat,
} from '../api/client'

function watchedOnly(stats: WatchStat[]) {
  return stats.filter((row) => row.totalWatchedMinutes > 0 || row.viewerCount > 0)
}

export function useAdminAnalytics(refreshMs = 30_000) {
  const [watchStats, setWatchStats] = useState<WatchStat[]>([])
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [watchStatsError, setWatchStatsError] = useState(false)
  const [overviewError, setOverviewError] = useState(false)

  const load = useCallback(async () => {
    const [watchResult, overviewResult] = await Promise.allSettled([
      fetchWatchStats(),
      fetchAnalyticsOverview(),
    ])

    if (watchResult.status === 'fulfilled') {
      setWatchStats(watchedOnly(watchResult.value.stats))
      setWatchStatsError(false)
    } else {
      setWatchStats([])
      setWatchStatsError(true)
    }

    if (overviewResult.status === 'fulfilled') {
      setOverview(overviewResult.value)
      setOverviewError(false)
    } else {
      setOverview(null)
      setOverviewError(true)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    if (!refreshMs) return undefined

    const interval = window.setInterval(() => {
      void load()
    }, refreshMs)

    return () => window.clearInterval(interval)
  }, [load, refreshMs])

  const watchStatsById = useMemo(
    () => new Map(watchStats.map((row) => [row.contentId, row])),
    [watchStats],
  )

  return {
    watchStats,
    watchStatsById,
    overview,
    loading,
    watchStatsError,
    overviewError,
    reload: load,
  }
}
