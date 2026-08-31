import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  confirmAdminSettlementPeriod,
  fetchAdminSettlementPeriods,
  fetchAdminSettlementReport,
  markAdminSettlementPaid,
  reopenAdminSettlementPeriod,
  type SettlementContentItem,
  type SettlementReport,
} from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { fuzzySearchMatch } from '../../utils/search'

type PoolTab = SettlementContentItem['pool'] | 'creators'

const POOL_TABS: Array<{ id: PoolTab; label: string }> = [
  { id: 'short', label: 'Kısa film (%5)' },
  { id: 'student', label: 'Genç Sinema (%5)' },
  { id: 'documentary', label: 'Belgesel & dikey (%10)' },
  { id: 'long', label: 'Uzun metraj (%30)' },
  { id: 'creators', label: 'Yapımcı özeti' },
]

function statusLabel(status: SettlementReport['status']) {
  if (status === 'open') return 'Açık'
  if (status === 'confirmed') return 'Onaylandı'
  return 'Ödendi'
}

function completionTone(percent: number) {
  if (percent >= 70) return 'text-emerald-300'
  if (percent >= 40) return 'text-amber-300'
  return 'text-red-300'
}

export function AdminSettlementPanel() {
  const [periods, setPeriods] = useState<Array<{ periodId: string; label: string; status: string }>>([])
  const [periodId, setPeriodId] = useState('')
  const [report, setReport] = useState<SettlementReport | null>(null)
  const [poolTab, setPoolTab] = useState<PoolTab>('long')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadPeriods = useCallback(async () => {
    const { periods: data } = await fetchAdminSettlementPeriods()
    setPeriods(data)
    if (!periodId && data.length > 0) {
      const current = data.find((entry) => entry.isCurrent) ?? data[0]
      setPeriodId(current.periodId)
    }
  }, [periodId])

  const loadReport = useCallback(async () => {
    if (!periodId) return
    setLoading(true)
    setError('')
    try {
      const { report: data } = await fetchAdminSettlementReport(periodId)
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dağıtım raporu yüklenemedi.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadPeriods().catch((err) => {
      setError(err instanceof Error ? err.message : 'Dönemler yüklenemedi.')
    })
  }, [loadPeriods])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const poolItems = useMemo(() => {
    if (!report || poolTab === 'creators') return []
    return report.items.filter((item) => item.pool === poolTab)
  }, [report, poolTab])

  const filteredItems = useMemo(() => {
    return poolItems.filter((item) =>
      fuzzySearchMatch(query, item.title, item.creatorName ?? '', item.studioName ?? ''),
    )
  }, [poolItems, query])

  const filteredCreators = useMemo(() => {
    if (!report) return []
    return report.creators.filter((item) =>
      fuzzySearchMatch(query, item.creatorName ?? '', item.studioName ?? ''),
    )
  }, [report, query])

  const activePoolSummary = useMemo(() => {
    if (!report || poolTab === 'creators') return null
    return report.poolSummaries.find((entry) => entry.pool === poolTab) ?? null
  }, [report, poolTab])

  async function handleConfirm() {
    if (!periodId || !window.confirm('Dönemi onaylamak istediğinize emin misiniz? Pay oranları kilitlenir.')) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { report: data } = await confirmAdminSettlementPeriod(periodId)
      setReport(data)
      setMessage('Dönem onaylandı.')
      await loadPeriods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onaylanamadı.')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkPaid() {
    if (!periodId || !window.confirm('Dağıtım yapıldı olarak işaretlensin mi?')) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { report: data } = await markAdminSettlementPaid(periodId)
      setReport(data)
      setMessage('Dönem ödendi olarak işaretlendi.')
      await loadPeriods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncellenemedi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReopen() {
    if (!periodId || !window.confirm('Dönemi yeniden açmak istediğinize emin misiniz?')) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { report: data } = await reopenAdminSettlementPeriod(periodId)
      setReport(data)
      setMessage('Dönem yeniden açıldı.')
      await loadPeriods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yeniden açılamadı.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">6 Aylık Kar Dağıtımı</h2>
        <p className="mt-1 text-sm text-plooy-muted">
          Giderler düşüldükten sonra kalan tutar bu yüzdelere göre dağıtılır. Panel yalnızca pay oranlarını gösterir;
          gerçek TL hesabı muhasebe dışında yapılır.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-plooy-muted">Ödeme dönemi</span>
          <select
            value={periodId}
            onChange={(event) => setPeriodId(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white"
          >
            {periods.map((period) => (
              <option key={period.periodId} value={period.periodId}>
                {period.label}
              </option>
            ))}
          </select>
        </label>

        {report?.status === 'open' && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleConfirm()}
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            Dönemi onayla
          </button>
        )}
        {report?.status === 'confirmed' && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleMarkPaid()}
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            Dağıtıldı işaretle
          </button>
        )}
        {report && report.status !== 'open' && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleReopen()}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 disabled:opacity-50"
          >
            Yeniden aç
          </button>
        )}
      </div>

      {report && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Durum · nitelikli izlenme</p>
              <p className="mt-1 text-sm font-semibold text-white">{statusLabel(report.status)}</p>
              <p className="mt-1 text-lg font-bold text-plooy-gold">{report.totalQualifiedMinutes} dk</p>
            </div>
            {report.poolSummaries.map((pool) => (
              <div
                key={pool.pool}
                className={`rounded-xl border p-4 ${
                  pool.pool === 'plooy'
                    ? 'border-white/10 bg-[#11141c]'
                    : poolTab === pool.pool
                      ? 'border-plooy-gold/30 bg-plooy-gold/5'
                      : 'border-white/10 bg-[#11141c]'
                }`}
              >
                <p className="text-xs text-plooy-muted">{pool.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">%{pool.effectiveRatePercent}</p>
                {pool.pool !== 'plooy' ? (
                  <p className="mt-1 text-xs text-plooy-muted">
                    {pool.contentCount} film · {pool.qualifiedMinutes} dk
                  </p>
                ) : pool.effectiveRatePercent > pool.ratePercent ? (
                  <p className="mt-1 text-xs text-plooy-muted">Boş havuzlar dahil</p>
                ) : null}
              </div>
            ))}
          </div>

          <p className="text-sm text-plooy-muted">
            Yapımcılara giden toplam pay:{' '}
            <span className="font-semibold text-emerald-300">%{report.totalCreatorSharePercent}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            {POOL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPoolTab(tab.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  poolTab === tab.id ? 'bg-plooy-gold/15 text-plooy-gold' : 'bg-white/5 text-white/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activePoolSummary && (
            <p className="text-sm text-plooy-muted">
              {activePoolSummary.label} havuzu:{' '}
              <span className="text-white">%{activePoolSummary.effectiveRatePercent}</span> ·{' '}
              {activePoolSummary.contentCount} film · {activePoolSummary.qualifiedMinutes} nitelikli dk
            </p>
          )}
        </>
      )}

      <AdminSearchBar
        value={query}
        onChange={setQuery}
        placeholder={poolTab === 'creators' ? 'Yapımcı ara...' : 'Film veya yapımcı ara...'}
        resultCount={poolTab === 'creators' ? filteredCreators.length : filteredItems.length}
        totalCount={
          poolTab === 'creators' ? report?.creators.length ?? 0 : poolItems.length
        }
      />

      {loading ? (
        <p className="text-sm text-plooy-muted">Yükleniyor...</p>
      ) : !report ? (
        <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
          Rapor yüklenemedi.
        </p>
      ) : poolTab === 'creators' ? (
        filteredCreators.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
            Bu dönem için kayıt yok.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#11141c]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#11141c] text-plooy-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Yapımcı / Öğrenci</th>
                  <th className="px-4 py-3 font-medium">Film</th>
                  <th className="px-4 py-3 font-medium">Nitelikli dk</th>
                  <th className="px-4 py-3 font-medium">Kar payı</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map((item) => (
                  <tr key={item.creatorId} className="border-t border-white/5">
                    <td className="px-4 py-3 text-white">
                      <p>{item.creatorName ?? item.studioName ?? '—'}</p>
                      {item.studioName && item.creatorName ? (
                        <p className="text-xs text-plooy-muted">{item.studioName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-plooy-muted">{item.contentCount}</td>
                    <td className="px-4 py-3 text-plooy-gold">{item.qualifiedMinutes} dk</td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">%{item.profitSharePercent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : filteredItems.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
          Bu havuzda nitelikli izlenme kaydı yok.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#11141c]">
          <div className="max-h-[min(70vh,680px)] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#11141c] text-plooy-muted shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Film</th>
                  <th className="px-4 py-3 font-medium">Yapımcı</th>
                  <th className="px-4 py-3 font-medium">Nitelikli dk</th>
                  <th className="px-4 py-3 font-medium">Ort. tamamlanma</th>
                  <th className="px-4 py-3 font-medium">Havuz içi pay</th>
                  <th className="px-4 py-3 font-medium">Kar payı</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.contentId} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{item.title}</td>
                    <td className="px-4 py-3 text-plooy-muted">
                      {item.creatorName ?? item.studioName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-plooy-gold">{item.qualifiedMinutes} dk</td>
                    <td className={`px-4 py-3 font-semibold ${completionTone(item.avgCompletionPercent)}`}>
                      %{item.avgCompletionPercent}
                    </td>
                    <td className="px-4 py-3 text-white/80">%{item.poolSharePercent}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">%{item.profitSharePercent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
