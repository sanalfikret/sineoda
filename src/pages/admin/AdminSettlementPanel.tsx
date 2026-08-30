import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  confirmAdminSettlementPeriod,
  fetchAdminSettlementPeriods,
  fetchAdminSettlementReport,
  markAdminSettlementPaid,
  reopenAdminSettlementPeriod,
  saveAdminSettlementNetRevenue,
  type SettlementReport,
} from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { fuzzySearchMatch } from '../../utils/search'
import { BRAND_NAME } from '../../constants/brand'

function formatTry(amount: number) {
  return `${amount.toLocaleString('tr-TR')} TL`
}

function statusLabel(status: SettlementReport['status']) {
  if (status === 'open') return 'Açık — düzenlenebilir'
  if (status === 'confirmed') return 'Onaylandı — ödeme bekliyor'
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
  const [netRevenueInput, setNetRevenueInput] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'content' | 'creators'>('content')
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
      setNetRevenueInput(data.netRevenue > 0 ? String(data.netRevenue) : '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme raporu yüklenemedi.')
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

  const filteredItems = useMemo(() => {
    if (!report) return []
    return report.items.filter((item) =>
      fuzzySearchMatch(query, item.title, item.creatorName ?? '', item.studioName ?? '', item.poolLabel),
    )
  }, [report, query])

  const filteredCreators = useMemo(() => {
    if (!report) return []
    return report.creators.filter((item) =>
      fuzzySearchMatch(query, item.creatorName ?? '', item.studioName ?? ''),
    )
  }, [report, query])

  async function handleSaveNetRevenue() {
    if (!periodId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const netRevenue = Number(netRevenueInput.replace(/\./g, '').replace(',', '.'))
      const { report: data } = await saveAdminSettlementNetRevenue(periodId, netRevenue)
      setReport(data)
      setNetRevenueInput(data.netRevenue > 0 ? String(data.netRevenue) : '')
      setMessage('Net gelir kaydedildi.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirm() {
    if (!periodId || !window.confirm('Dönemi onaylamak istediğinize emin misiniz? Rakamlar kilitlenir.')) return
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
    if (!periodId || !window.confirm('Ödemeler yapıldı olarak işaretlensin mi?')) return
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
        <h2 className="text-xl font-bold text-white">6 Aylık Ödeme Dönemi</h2>
        <p className="mt-1 text-sm text-plooy-muted">
          Ocak–Haziran ve Temmuz–Aralık dönemlerinde toplam nitelikli izlenmeye göre ödeme hesaplanır.
          Aylık izlenme raporları ayrı sekmede kalır.
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

        {report?.isEditable && (
          <>
            <label className="block">
              <span className="mb-1 block text-xs text-plooy-muted">6 aylık net gelir (TL)</span>
              <input
                type="text"
                inputMode="numeric"
                value={netRevenueInput}
                onChange={(event) => setNetRevenueInput(event.target.value)}
                placeholder="ör. 600000"
                className="w-40 rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white"
              />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveNetRevenue()}
              className="rounded-lg bg-plooy-gold/20 px-4 py-2 text-sm font-medium text-plooy-gold hover:bg-plooy-gold/30 disabled:opacity-50"
            >
              Net geliri kaydet
            </button>
          </>
        )}

        {report?.status === 'open' && report.netRevenue > 0 && (
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
            Ödendi işaretle
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Durum</p>
              <p className="mt-1 text-sm font-semibold text-white">{statusLabel(report.status)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">6 aylık nitelikli izlenme</p>
              <p className="mt-1 text-2xl font-bold text-plooy-gold">{report.totalQualifiedMinutes} dk</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Net gelir</p>
              <p className="mt-1 text-2xl font-bold text-white">{formatTry(report.netRevenue)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">{BRAND_NAME} payı (%50)</p>
              <p className="mt-1 text-xl font-bold text-white">{formatTry(report.pools.plooy)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Yapımcı ödemeleri</p>
              <p className="mt-1 text-xl font-bold text-emerald-300">{formatTry(report.totalCreatorPayout)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Havuzlar (kısa / genç / uzun)</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatTry(report.pools.short)} / {formatTry(report.pools.student)} / {formatTry(report.pools.long)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView('content')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                view === 'content' ? 'bg-plooy-gold/15 text-plooy-gold' : 'bg-white/5 text-white/70'
              }`}
            >
              Film bazında
            </button>
            <button
              type="button"
              onClick={() => setView('creators')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                view === 'creators' ? 'bg-plooy-gold/15 text-plooy-gold' : 'bg-white/5 text-white/70'
              }`}
            >
              Yapımcı özeti
            </button>
          </div>
        </>
      )}

      <AdminSearchBar
        value={query}
        onChange={setQuery}
        placeholder={view === 'content' ? 'Film veya yapımcı ara...' : 'Yapımcı ara...'}
        resultCount={view === 'content' ? filteredItems.length : filteredCreators.length}
        totalCount={view === 'content' ? report?.items.length ?? 0 : report?.creators.length ?? 0}
      />

      {loading ? (
        <p className="text-sm text-plooy-muted">Yükleniyor...</p>
      ) : !report ? (
        <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
          Rapor yüklenemedi.
        </p>
      ) : view === 'creators' ? (
        filteredCreators.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
            Bu dönem için ödeme kaydı yok.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#11141c]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#11141c] text-plooy-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Yapımcı / Öğrenci</th>
                  <th className="px-4 py-3 font-medium">Film sayısı</th>
                  <th className="px-4 py-3 font-medium">Nitelikli dk</th>
                  <th className="px-4 py-3 font-medium">Ödeme</th>
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
                    <td className="px-4 py-3 font-semibold text-emerald-300">{formatTry(item.payoutAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : filteredItems.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
          Bu dönem için nitelikli izlenme kaydı yok. Net gelir girildiğinde ödemeler otomatik hesaplanır.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#11141c]">
          <div className="max-h-[min(70vh,680px)] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#11141c] text-plooy-muted shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Film</th>
                  <th className="px-4 py-3 font-medium">Yapımcı</th>
                  <th className="px-4 py-3 font-medium">Havuz</th>
                  <th className="px-4 py-3 font-medium">6 aylık nitelikli dk</th>
                  <th className="px-4 py-3 font-medium">Ort. tamamlanma</th>
                  <th className="px-4 py-3 font-medium">Havuz payı</th>
                  <th className="px-4 py-3 font-medium">Ödeme</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.contentId} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{item.title}</td>
                    <td className="px-4 py-3 text-plooy-muted">
                      {item.creatorName ?? item.studioName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-plooy-muted">{item.poolLabel}</td>
                    <td className="px-4 py-3 text-plooy-gold">{item.qualifiedMinutes} dk</td>
                    <td className={`px-4 py-3 font-semibold ${completionTone(item.avgCompletionPercent)}`}>
                      %{item.avgCompletionPercent}
                    </td>
                    <td className="px-4 py-3 text-white/80">%{item.poolSharePercent}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">{formatTry(item.payoutAmount)}</td>
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
