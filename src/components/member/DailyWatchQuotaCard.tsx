import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchDailyWatchUsage, type DailyWatchUsage } from '../../api/client'

export function DailyWatchQuotaCard() {
  const { t } = useTranslation('account')
  const [usage, setUsage] = useState<DailyWatchUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchDailyWatchUsage()
      .then(({ usage: data }) => setUsage(data))
      .catch(() => setUsage(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-plooy-muted">{t('dailyQuota.loading')}</p>
  }

  if (!usage) return null

  const titlesPct = Math.min(100, (usage.titlesUsed / usage.titleLimit) * 100)
  const minutesPct = Math.min(100, (usage.minutesUsed / usage.minuteLimit) * 100)

  return (
    <div className="space-y-4">
      <p className="text-sm text-plooy-muted">{t('dailyQuota.note')}</p>
      <div>
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="text-white/90">{t('dailyQuota.titles')}</span>
          <span className="text-plooy-muted">
            {t('dailyQuota.titlesCount', { used: usage.titlesUsed, limit: usage.titleLimit })}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-plooy-gold transition-all"
            style={{ width: `${titlesPct}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="text-white/90">{t('dailyQuota.minutes')}</span>
          <span className="text-plooy-muted">
            {t('dailyQuota.minutesCount', { used: usage.minutesUsed, limit: usage.minuteLimit })}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400/80 transition-all"
            style={{ width: `${minutesPct}%` }}
          />
        </div>
      </div>
      {(usage.titlesRemaining === 0 || usage.minutesRemaining === 0) && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {t('dailyQuota.limitReached')}
        </p>
      )}
    </div>
  )
}
