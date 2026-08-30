import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAdminMonthlyPeriods,
  fetchAdminMonthlyReport,
  type MonthlyAccountingItem,
  type MonthlyAccountingReport,
} from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { AdminSettlementPanel } from './AdminSettlementPanel'
import { fuzzySearchMatch } from '../../utils/search'
import { BRAND_NAME } from '../../constants/brand'

const PROGRAM_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'platform', label: 'Platform' },
  { id: 'standard', label: 'Bağımsız yapımcı' },
  { id: 'student_cinema', label: 'Genç Sinema' },
] as const

type ProgramFilter = (typeof PROGRAM_FILTERS)[number]['id']

function formatMonthLabel(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const date = new Date(year, mon - 1, 1)
  return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

function programLabel(program: MonthlyAccountingItem['program']) {
  if (program === 'platform') return 'Platform'
  if (program === 'student_cinema') return 'Genç Sinema'
  return 'Bağımsız yapımcı'
}

function completionTone(percent: number) {
  if (percent >= 70) return 'text-emerald-300'
  if (percent >= 40) return 'text-amber-300'
  return 'text-red-300'
}

function completionInsight(percent: number) {
  if (percent >= 85) return 'Güçlü tutma'
  if (percent >= 70) return 'İyi izleniyor'
  if (percent >= 40) return 'Orta — erken terk var'
  if (percent > 0) return 'Zayıf — çoğu erken bırakıyor'
  return '—'
}

export function AdminWatchAccountingPage() {
  const [tab, setTab] = useState<'monthly' | 'settlement'>('monthly')
  const [periods, setPeriods] = useState<Array<{ month: string; status: string }>>([])
  const [month, setMonth] = useState('')
  const [program, setProgram] = useState<ProgramFilter>('all')
  const [report, setReport] = useState<MonthlyAccountingReport | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPeriods = useCallback(async () => {
    const { periods: data } = await fetchAdminMonthlyPeriods()
    setPeriods(data)
    if (!month && data.length > 0) {
      setMonth(data[0].month)
    }
  }, [month])

  const loadReport = useCallback(async () => {
    if (!month) return
    setLoading(true)
    setError('')
    try {
      const { report: data } = await fetchAdminMonthlyReport(month, program)
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Muhasebe raporu yüklenemedi.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [month, program])

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
      fuzzySearchMatch(
        query,
        item.title,
        item.creatorName ?? '',
        item.studioName ?? '',
        programLabel(item.program),
      ),
    )
  }, [report, query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Muhasebe</h1>
        <p className="mt-1 text-sm text-plooy-muted">
          Aylık izlenme analizi ve 6 aylık ödeme dönemleri (Ocak–Haziran / Temmuz–Aralık).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('monthly')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            tab === 'monthly' ? 'bg-plooy-gold/15 text-plooy-gold' : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          Aylık izlenme
        </button>
        <button
          type="button"
          onClick={() => setTab('settlement')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            tab === 'settlement' ? 'bg-plooy-gold/15 text-plooy-gold' : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          6 aylık ödeme
        </button>
      </div>

      {tab === 'settlement' ? (
        <AdminSettlementPanel />
      ) : (
        <>
      <div>
        <h2 className="text-xl font-bold text-white">Aylık İzlenme</h2>
        <p className="mt-1 text-sm text-plooy-muted">
          Her ayın 1&apos;inde sıfırlanır, ay sonunda arşivlenir. Nitelikli izlenme paylaşımı ve ortalama tamamlanma analizi burada görünür.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-plooy-muted">Dönem</span>
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white"
          >
            {periods.map((period) => (
              <option key={period.month} value={period.month}>
                {formatMonthLabel(period.month)} {period.status === 'open' ? '(devam ediyor)' : '(kapandı)'}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {PROGRAM_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setProgram(filter.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                program === filter.id
                  ? 'bg-plooy-gold/15 text-plooy-gold'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Toplam nitelikli izlenme</p>
              <p className="mt-1 text-2xl font-bold text-plooy-gold">{report.totalQualifiedMinutes} dk</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Toplam izlenme</p>
              <p className="mt-1 text-2xl font-bold text-white">{report.totalWatchMinutes} dk</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Bu ay yeni üye</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{report.memberStats?.newMembersThisMonth ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Mevcut üye sayısı</p>
              <p className="mt-1 text-2xl font-bold text-white">{report.memberStats?.totalMembers ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">Durum</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {report.status === 'open' ? 'Ay devam ediyor' : 'Arşivlendi'}
              </p>
            </div>
          </div>
        </>
      )}

      <AdminSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Film, yapımcı veya stüdyo ara..."
        resultCount={filteredItems.length}
        totalCount={report?.items.length ?? 0}
      />

      {loading ? (
        <p className="text-sm text-plooy-muted">Yükleniyor...</p>
      ) : !report || filteredItems.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
          Bu dönem için kayıt yok.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#11141c]">
          <div className="max-h-[min(70vh,680px)] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#11141c] text-plooy-muted shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Film</th>
                  <th className="px-4 py-3 font-medium">Yapımcı / Öğrenci</th>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Nitelikli dk</th>
                  <th className="px-4 py-3 font-medium">Ort. tamamlanma</th>
                  <th className="px-4 py-3 font-medium">Nitelikli izleyici</th>
                  <th className="px-4 py-3 font-medium">Pay %</th>
                  <th className="px-4 py-3 font-medium">İzleyici</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.contentId} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{item.title}</td>
                    <td className="px-4 py-3 text-plooy-muted">
                      <p>
                        {item.program === 'platform'
                          ? BRAND_NAME
                          : item.creatorName ?? item.studioName ?? '—'}
                      </p>
                      {item.studioName && item.creatorName && item.program !== 'platform' ? (
                        <p className="text-xs">{item.studioName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-plooy-muted">{programLabel(item.program)}</td>
                    <td className="px-4 py-3 text-emerald-300">{item.qualifiedMinutes} dk</td>
                    <td className="px-4 py-3">
                      <p className={`font-semibold ${completionTone(item.avgCompletionPercent)}`}>
                        %{item.avgCompletionPercent}
                      </p>
                      <p className="text-xs text-plooy-muted">{completionInsight(item.avgCompletionPercent)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-semibold ${completionTone(item.qualifiedViewerPercent)}`}>
                        %{item.qualifiedViewerPercent}
                      </p>
                      {item.completionViewerCount > 0 ? (
                        <p className="text-xs text-plooy-muted">{item.completionViewerCount} izleyici</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold text-plooy-gold">%{item.sharePercent}</td>
                    <td className="px-4 py-3 text-white/80">{item.viewerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
