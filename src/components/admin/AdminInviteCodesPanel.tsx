import { useCallback, useEffect, useState } from 'react'
import {
  createAdminInviteBatch,
  deleteAdminInviteBatch,
  fetchAdminInviteBatchCodes,
  fetchAdminInvites,
  fetchAdminBillingPlans,
  revokeAdminInviteBatch,
  type InviteBatchSummary,
  type InviteCodeEntry,
  type InviteStats,
} from '../../api/client'

const PRESETS = [100, 500, 1000]

interface AdminInviteCodesPanelProps {
  inviteOnly: boolean
  onToggleInviteOnly: (next: boolean) => Promise<void>
  inviteMessage: string
  onInviteMessageChange: (value: string) => void
  onSaveMessage: () => Promise<void>
  saving: boolean
}

export function AdminInviteCodesPanel({
  inviteOnly,
  onToggleInviteOnly,
  inviteMessage,
  onInviteMessageChange,
  onSaveMessage,
  saving,
}: AdminInviteCodesPanelProps) {
  const [stats, setStats] = useState<InviteStats>({ total: 0, used: 0, active: 0, revoked: 0 })
  const [batches, setBatches] = useState<InviteBatchSummary[]>([])
  const [plans, setPlans] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [toggling, setToggling] = useState(false)
  const [form, setForm] = useState({ count: 500, label: '', prefix: 'PLOOY', planId: 'standard', grantMonths: 0, expiresAt: '' })
  const [creating, setCreating] = useState(false)
  const [lastBatch, setLastBatch] = useState<{ batchId: string; label: string; codes: string[] } | null>(null)
  const [openBatchId, setOpenBatchId] = useState<string | null>(null)
  const [batchCodes, setBatchCodes] = useState<InviteCodeEntry[]>([])
  const [batchFilter, setBatchFilter] = useState<'all' | 'active' | 'used' | 'revoked'>('all')
  const [codesLoading, setCodesLoading] = useState(false)
  const [busyBatch, setBusyBatch] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [invites, billing] = await Promise.all([fetchAdminInvites(), fetchAdminBillingPlans().catch(() => null)])
      setStats(invites.stats)
      setBatches(invites.batches)
      if (billing) {
        const viewerPlans = billing.plans.filter((plan) => plan.audience !== 'creator').map((plan) => ({ id: plan.id, name: plan.name }))
        setPlans(viewerPlans)
        if (viewerPlans.length > 0 && !viewerPlans.some((plan) => plan.id === form.planId)) {
          setForm((current) => ({ ...current, planId: viewerPlans[0].id }))
        }
      }
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Davet verileri yüklenemedi.')
    } finally {
      setLoading(false)
    }
    // form.planId intentionally excluded: only used to seed a default once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const loadBatchCodes = useCallback(async (batchId: string, filter: typeof batchFilter) => {
    setCodesLoading(true)
    try {
      const { codes } = await fetchAdminInviteBatchCodes(batchId, filter)
      setBatchCodes(codes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kodlar yüklenemedi.')
      setBatchCodes([])
    } finally {
      setCodesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (openBatchId) void loadBatchCodes(openBatchId, batchFilter)
  }, [openBatchId, batchFilter, loadBatchCodes])

  const handleToggle = async () => {
    setToggling(true)
    setError('')
    setNotice('')
    try {
      await onToggleInviteOnly(!inviteOnly)
      setNotice(!inviteOnly ? 'Davetli üyelik AÇILDI. Artık izleyici kaydı yalnızca davet koduyla yapılır.' : 'Davetli üyelik kapatıldı. Herkes normal şekilde üye olabilir.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mod değiştirilemedi.')
    } finally {
      setToggling(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    setError('')
    setNotice('')
    try {
      const result = await createAdminInviteBatch({
        count: form.count,
        label: form.label,
        prefix: form.prefix,
        planId: form.planId,
        grantMonths: form.grantMonths,
        expiresAt: form.expiresAt || null,
      })
      setStats(result.stats)
      setBatches(result.batches)
      setLastBatch({ batchId: result.batch.batchId, label: result.batch.label, codes: result.batch.codes })
      setNotice(`${result.batch.codes.length} davet kodu üretildi (${result.batch.label}).`)
      setForm((current) => ({ ...current, label: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Davet paketi oluşturulamadı.')
    } finally {
      setCreating(false)
    }
  }

  const downloadText = (filename: string, lines: string[]) => {
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const copyText = async (lines: string[], label: string) => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setNotice(`${label} panoya kopyalandı (${lines.length} kod).`)
    } catch {
      setError('Panoya kopyalanamadı; indir düğmesini kullanın.')
    }
  }

  const downloadBatch = async (batch: InviteBatchSummary, filter: 'all' | 'active') => {
    try {
      const { codes } = await fetchAdminInviteBatchCodes(batch.batchId, filter)
      downloadText(`davet-${batch.prefix}-${batch.createdAt.slice(0, 10)}${filter === 'active' ? '-kullanilmamis' : ''}.txt`, codes.map((entry) => entry.code))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kodlar indirilemedi.')
    }
  }

  const handleRevoke = async (batch: InviteBatchSummary) => {
    if (!window.confirm(`"${batch.label}" paketindeki kullanılmamış ${batch.active} kod iptal edilsin mi? Kullanılmış olanlar etkilenmez.`)) return
    setBusyBatch(batch.batchId)
    setError('')
    try {
      const result = await revokeAdminInviteBatch(batch.batchId)
      setStats(result.stats)
      setBatches(result.batches)
      if (openBatchId === batch.batchId) void loadBatchCodes(batch.batchId, batchFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Paket iptal edilemedi.')
    } finally {
      setBusyBatch(null)
    }
  }

  const handleDelete = async (batch: InviteBatchSummary) => {
    if (!window.confirm(`"${batch.label}" paketi tamamen silinsin mi?`)) return
    setBusyBatch(batch.batchId)
    setError('')
    try {
      const result = await deleteAdminInviteBatch(batch.batchId)
      setStats(result.stats)
      setBatches(result.batches)
      if (openBatchId === batch.batchId) setOpenBatchId(null)
      if (lastBatch?.batchId === batch.batchId) setLastBatch(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Paket silinemedi.')
    } finally {
      setBusyBatch(null)
    }
  }

  const inputClass = 'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-plooy-gold'
  const planName = (id: string) => plans.find((plan) => plan.id === id)?.name ?? id

  return (
    <section className={`space-y-5 rounded-2xl border p-5 ${inviteOnly ? 'border-plooy-gold/40 bg-plooy-gold/5' : 'border-white/10 bg-[#11141c]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Davetli Üyelik (Lansman)</h2>
          <p className="mt-1 max-w-2xl text-sm text-plooy-muted">
            Açıkken izleyici kaydı yalnızca davet koduyla yapılır. Kod üret, dağıt; her kod tek kişilik. Mevcut üyeler ve
            yapımcılar etkilenmez. Kapatınca herkes normal üye olabilir.
          </p>
        </div>
        <button
          type="button"
          disabled={toggling}
          onClick={() => void handleToggle()}
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${
            inviteOnly ? 'bg-plooy-gold text-plooy-bg' : 'border border-plooy-gold/50 text-plooy-gold hover:bg-plooy-gold/10'
          }`}
        >
          {toggling ? '...' : inviteOnly ? 'Davetli üyelik AÇIK — kapat' : 'Davetli üyeliği tek tıkla aç'}
        </button>
      </div>

      {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">{notice}</p>}
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Toplam kod', stats.total, 'text-white'],
          ['Kullanılmamış', stats.active, 'text-emerald-300'],
          ['Kullanılmış', stats.used, 'text-plooy-gold'],
          ['İptal', stats.revoked, 'text-white/60'],
        ].map(([label, value, cls]) => (
          <div key={String(label)} className="rounded-xl border border-white/10 bg-[#0d0f14]/70 p-3">
            <p className="text-xs text-plooy-muted">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-white">Kayıt sayfasında görünen mesaj</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={inviteMessage} onChange={(event) => onInviteMessageChange(event.target.value)} className={inputClass} maxLength={300} />
          <button type="button" disabled={saving} onClick={() => void onSaveMessage()} className="shrink-0 rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-60">
            Mesajı kaydet
          </button>
        </div>
      </label>

      <div className="rounded-xl border border-white/10 bg-[#0d0f14]/70 p-4">
        <h3 className="font-semibold text-white">Yeni davet paketi üret</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-plooy-muted">Kod adedi</span>
            <div className="flex gap-2">
              <input type="number" min={1} max={5000} value={form.count} onChange={(event) => setForm((current) => ({ ...current, count: Math.max(1, Math.min(5000, Number(event.target.value) || 1)) }))} className={inputClass} />
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {PRESETS.map((preset) => (
                <button key={preset} type="button" onClick={() => setForm((current) => ({ ...current, count: preset }))} className={`rounded-full px-2.5 py-1 text-xs ${form.count === preset ? 'bg-plooy-gold/20 text-plooy-gold' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                  {preset}
                </button>
              ))}
            </div>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-plooy-muted">Paket adı (örn. şirket / etkinlik)</span>
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Lansman — Eylül 2026" className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-plooy-muted">Kod ön eki</span>
            <input value={form.prefix} onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value.toUpperCase() }))} maxLength={8} className={`${inputClass} font-mono uppercase`} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-plooy-muted">Kodla gelen ücretsiz süre (ay)</span>
            <input type="number" min={0} max={36} value={form.grantMonths} onChange={(event) => setForm((current) => ({ ...current, grantMonths: Math.max(0, Math.min(36, Number(event.target.value) || 0)) }))} className={inputClass} />
            <span className="mt-1 block text-xs text-plooy-muted">0 = sadece kayıt hakkı; ödeme normal akışta.</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-plooy-muted">Ücretsiz sürenin planı</span>
            <select value={form.planId} onChange={(event) => setForm((current) => ({ ...current, planId: event.target.value }))} className={inputClass} disabled={form.grantMonths === 0}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-plooy-muted">Kodların son kullanma tarihi (isteğe bağlı)</span>
            <input type="date" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} className={inputClass} />
          </label>
        </div>
        <button type="button" disabled={creating} onClick={() => void handleCreate()} className="mt-4 rounded-lg bg-plooy-gold px-5 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60">
          {creating ? 'Üretiliyor…' : `${form.count} kod üret`}
        </button>
        <p className="mt-2 text-xs text-plooy-muted">Örnek kod: <span className="font-mono text-white/80">{form.prefix || 'PLOOY'}-7K4M-Q2XR</span> · Kayıt linki: <span className="font-mono text-white/80">/kayit?davet=KOD</span></p>
      </div>

      {lastBatch && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-emerald-100">Son üretilen paket: {lastBatch.label} · {lastBatch.codes.length} kod</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void copyText(lastBatch.codes, 'Kodlar')} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/5">Tümünü kopyala</button>
              <button type="button" onClick={() => downloadText(`davet-${lastBatch.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`, lastBatch.codes)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black">.txt indir</button>
            </div>
          </div>
          <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-[#0d0f14] p-3 font-mono text-xs text-white/80">
            {lastBatch.codes.slice(0, 200).join('  ')}
            {lastBatch.codes.length > 200 && ` … (+${lastBatch.codes.length - 200})`}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-white">Paketler</h3>
        {loading ? (
          <p className="mt-2 text-sm text-plooy-muted">Yükleniyor...</p>
        ) : batches.length === 0 ? (
          <p className="mt-2 text-sm text-plooy-muted">Henüz davet paketi yok.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {batches.map((batch) => (
              <div key={batch.batchId} className="rounded-xl border border-white/10 bg-[#0d0f14]/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{batch.label}</p>
                    <p className="mt-1 text-xs text-plooy-muted">
                      <span className="font-mono">{batch.prefix}-****</span> · {new Date(batch.createdAt).toLocaleString('tr-TR')}
                      {batch.grantMonths > 0 ? ` · ${batch.grantMonths} ay ücretsiz (${planName(batch.planId)})` : ' · sadece kayıt hakkı'}
                      {batch.expiresAt ? ` · son kullanma ${new Date(batch.expiresAt).toLocaleDateString('tr-TR')}` : ''}
                    </p>
                    <p className="mt-2 text-sm text-white/80">
                      <span className="text-emerald-300">{batch.active} kullanılmamış</span> · <span className="text-plooy-gold">{batch.used} kullanılmış</span> · {batch.revoked} iptal · {batch.total} toplam
                    </p>
                    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-plooy-gold" style={{ width: `${batch.total ? Math.round((batch.used / batch.total) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void downloadBatch(batch, 'active')} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/5">Kullanılmamışları indir</button>
                    <button type="button" onClick={() => void downloadBatch(batch, 'all')} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5">Tümünü indir</button>
                    <button type="button" onClick={() => setOpenBatchId(openBatchId === batch.batchId ? null : batch.batchId)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5">
                      {openBatchId === batch.batchId ? 'Listeyi gizle' : 'Kodları gör'}
                    </button>
                    {batch.active > 0 && (
                      <button type="button" disabled={busyBatch === batch.batchId} onClick={() => void handleRevoke(batch)} className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-500/10 disabled:opacity-60">
                        Kalanları iptal et
                      </button>
                    )}
                    {batch.used === 0 && (
                      <button type="button" disabled={busyBatch === batch.batchId} onClick={() => void handleDelete(batch)} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-60">
                        Sil
                      </button>
                    )}
                  </div>
                </div>

                {openBatchId === batch.batchId && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {(
                        [
                          ['all', 'Tümü'],
                          ['active', 'Kullanılmamış'],
                          ['used', 'Kullanılmış'],
                          ['revoked', 'İptal'],
                        ] as const
                      ).map(([id, label]) => (
                        <button key={id} type="button" onClick={() => setBatchFilter(id)} className={`rounded-full px-3 py-1 text-xs ${batchFilter === id ? 'bg-plooy-gold/15 text-plooy-gold' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                          {label}
                        </button>
                      ))}
                      <button type="button" onClick={() => void copyText(batchCodes.map((entry) => entry.code), 'Liste')} className="ml-auto text-xs text-plooy-gold hover:underline">
                        Listeyi kopyala
                      </button>
                    </div>
                    {codesLoading ? (
                      <p className="text-xs text-plooy-muted">Yükleniyor...</p>
                    ) : batchCodes.length === 0 ? (
                      <p className="text-xs text-plooy-muted">Bu filtrede kod yok.</p>
                    ) : (
                      <div className="max-h-72 overflow-y-auto rounded-lg bg-[#0d0f14]">
                        <table className="min-w-full text-left text-xs">
                          <thead className="text-plooy-muted">
                            <tr>
                              <th className="px-3 py-2 font-medium">Kod</th>
                              <th className="px-3 py-2 font-medium">Durum</th>
                              <th className="px-3 py-2 font-medium">Kullanan</th>
                              <th className="px-3 py-2 font-medium">Tarih</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batchCodes.map((entry) => (
                              <tr key={entry.id} className="border-t border-white/5">
                                <td className="px-3 py-1.5 font-mono text-white/90">{entry.code}</td>
                                <td className="px-3 py-1.5">
                                  <span className={entry.status === 'used' ? 'text-plooy-gold' : entry.status === 'revoked' ? 'text-white/50' : 'text-emerald-300'}>
                                    {entry.status === 'used' ? 'Kullanıldı' : entry.status === 'revoked' ? 'İptal' : 'Kullanılmadı'}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-white/80">
                                  {entry.usedByName ?? '—'}
                                  {entry.usedByEmail ? <span className="text-plooy-muted"> · {entry.usedByEmail}</span> : null}
                                </td>
                                <td className="px-3 py-1.5 text-plooy-muted">{entry.usedAt ? new Date(entry.usedAt).toLocaleString('tr-TR') : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
