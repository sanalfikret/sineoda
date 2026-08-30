import { useEffect, useState } from 'react'
import {
  currentAwardPeriod,
  defaultBadgeForPeriod,
  formatAwardPeriod,
  TR_MONTH_NAMES,
  type MonthlyAward,
} from '../../utils/studentCinemaAward'

interface AdminStudentCinemaAwardPanelProps {
  award: MonthlyAward | undefined
  disabled?: boolean
  onChange: (award: MonthlyAward) => void
}

function buildPeriodOptions(count = 18) {
  const options: string[] = []
  const now = new Date()
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    options.push(`${date.getFullYear()}-${month}`)
  }
  return options
}

function awardFromFields(enabled: boolean, period: string, badge: string, prize: string): MonthlyAward {
  return {
    enabled,
    period: enabled ? period : null,
    badge: enabled ? badge.trim() || defaultBadgeForPeriod(period) : null,
    prize: enabled ? prize.trim() || null : null,
  }
}

export function AdminStudentCinemaAwardPanel({
  award,
  disabled = false,
  onChange,
}: AdminStudentCinemaAwardPanelProps) {
  const [enabled, setEnabled] = useState(Boolean(award?.enabled))
  const [period, setPeriod] = useState(award?.period ?? currentAwardPeriod())
  const [badge, setBadge] = useState(award?.badge ?? defaultBadgeForPeriod(period))
  const [prize, setPrize] = useState(award?.prize ?? '')
  const periodOptions = buildPeriodOptions()

  useEffect(() => {
    setEnabled(Boolean(award?.enabled))
    const nextPeriod = award?.period ?? currentAwardPeriod()
    setPeriod(nextPeriod)
    setBadge(award?.badge ?? defaultBadgeForPeriod(nextPeriod))
    setPrize(award?.prize ?? '')
  }, [award?.enabled, award?.period, award?.badge, award?.prize])

  const emitChange = (nextEnabled: boolean, nextPeriod: string, nextBadge: string, nextPrize: string) => {
    onChange(awardFromFields(nextEnabled, nextPeriod, nextBadge, nextPrize))
  }

  const handleEnabledChange = (nextEnabled: boolean) => {
    setEnabled(nextEnabled)
    emitChange(nextEnabled, period, badge, prize)
  }

  const handlePeriodChange = (nextPeriod: string) => {
    setPeriod(nextPeriod)
    const nextBadge =
      !badge.trim() || badge === defaultBadgeForPeriod(period) ? defaultBadgeForPeriod(nextPeriod) : badge
    setBadge(nextBadge)
    emitChange(enabled, nextPeriod, nextBadge, prize)
  }

  return (
    <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium text-emerald-200">Ayın Birincisi & Ödül</h2>
          <p className="mt-1 text-xs text-plooy-muted">
            Bu filmi seçtiğiniz ay için birinci ilan edin. Aynı ayda yalnızca bir film birinci olabilir;
            rozet ana sayfada ve film kartında görünür.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/90">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(event) => handleEnabledChange(event.target.checked)}
            className="rounded"
          />
          Ayın birincisi
        </label>
      </div>

      {enabled ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-plooy-muted">Yarışma dönemi</span>
            <select
              value={period}
              disabled={disabled}
              onChange={(event) => handlePeriodChange(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
            >
              {periodOptions.map((option) => (
                <option key={option} value={option}>
                  {formatAwardPeriod(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-plooy-muted">Rozet metni</span>
            <input
              type="text"
              value={badge}
              disabled={disabled}
              onChange={(event) => {
                setBadge(event.target.value)
                emitChange(enabled, period, event.target.value, prize)
              }}
              placeholder={defaultBadgeForPeriod(period)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
            />
            <p className="mt-1 text-[11px] text-plooy-muted">
              Örnek: {TR_MONTH_NAMES[Number(period.slice(5, 7)) - 1]} Birincisi
            </p>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-plooy-muted">Ödül (isteğe bağlı)</span>
            <input
              type="text"
              value={prize}
              disabled={disabled}
              onChange={(event) => {
                setPrize(event.target.value)
                emitChange(enabled, period, badge, event.target.value)
              }}
              placeholder="Örn. 5.000 ₺ nakit ödül"
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
            />
            <p className="mt-1 text-[11px] text-plooy-muted">
              Boş bırakırsanız ödül gösterilmez. Ödülü kaldırmak için metni silip kaydedin.
            </p>
          </label>
        </div>
      ) : (
        <p className="mt-3 text-xs text-plooy-muted">
          Birinci rozeti ve ödül bu film için gösterilmez.
        </p>
      )}
    </section>
  )
}
