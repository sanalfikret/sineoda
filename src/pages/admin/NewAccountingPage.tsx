import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { AccountingRules, AccountingReport, AccountingCreatorRow, ExpenseItem } from '../../../shared/accounting'
import { LegacyWatchAccountingPage } from './LegacyWatchAccountingPage'
import { ArrangeableGrid } from '../../components/admin/ArrangeableGrid'

const groups: Record<string, string> = { all: 'Tümü', platform: 'Plooy', standard: 'Bağımsız yapımcı', student_cinema: 'Genç Sinema' }
const EXPENSE_PRESETS = ['Ofis kirası', 'CDN / Bunny', 'Sunucu (VPS)', 'Vergi', 'Çalışan maaşı', 'Sanal POS komisyonu', 'Muhasebeci', 'Reklam', 'Diğer']
const field = 'rounded-lg border border-white/20 bg-[#11141c] px-3 py-2 text-white'
const button = 'rounded-lg border border-white/20 px-3 py-2 disabled:opacity-40'
const card = 'rounded-xl border border-white/10 bg-[#11141c] p-4'
const pct = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '%'
const tl = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })
const safe = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const formatIban = (iban: string) => iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
const round2 = (n: number) => Math.round(n * 100) / 100

type ExpenseDraft = { id: string; label: string; amount: string }
const newDraft = (label = ''): ExpenseDraft => ({ id: crypto.randomUUID().replace(/-/g, '').slice(0, 20), label, amount: '' })

function Step({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-plooy-gold text-sm font-bold text-black">{n}</span>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {hint && <p className="text-sm text-plooy-muted">{hint}</p>}
      </div>
    </div>
  )
}

export function AdminWatchAccountingPage() {
  const [rules, setRules] = useState<AccountingRules | null>(null)
  const [months, setMonths] = useState<{ month: string; closed_at: string | null }[]>([])
  const [categories, setCategories] = useState<{ id: string; title: string }[]>([])
  const [month, setMonth] = useState('')
  const [report, setReport] = useState<AccountingReport | null>(null)
  const [group, setGroup] = useState('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [legacy, setLegacy] = useState(false)
  const [drafts, setDrafts] = useState<ExpenseDraft[]>([])
  const [expenseNote, setExpenseNote] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let live = true
    api<{ rules: AccountingRules; months: typeof months; categories: typeof categories }>('/api/admin/accounting')
      .then((d) => {
        if (!live) return
        setRules(d.rules)
        setMonths(d.months)
        setCategories(d.categories)
        setMonth(d.months[0]?.month ?? '')
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!month) return
    let live = true
    setLoading(true)
    setReport(null)
    setError('')
    api<{ report: AccountingReport }>('/api/admin/accounting/' + month)
      .then((d) => {
        if (live) applyReport(d.report)
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [month])

  function applyReport(next: AccountingReport) {
    setReport(next)
    const items: ExpenseItem[] = next.finance.expenseItems.length
      ? next.finance.expenseItems
      : next.finance.expenses > 0
        ? [{ id: 'legacy', label: next.finance.expenseNote || 'Gider', amount: next.finance.expenses }]
        : []
    setDrafts(items.map((i) => ({ id: i.id, label: i.label, amount: String(i.amount) })))
    setExpenseNote(next.finance.expenseItems.length ? next.finance.expenseNote : '')
    setDirty(false)
  }

  const finance = report?.finance
  const draftTotal = round2(drafts.reduce((s, d) => s + (Number(d.amount.replace(',', '.')) || 0), 0))
  const previewNet = finance ? Math.max(0, round2(finance.grossRevenue - draftTotal)) : 0

  const rows = useMemo(() => {
    const list =
      report?.items.filter(
        (i) =>
          (group === 'all' || i.program === group) &&
          (i.title + ' ' + i.creatorName).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
      ) ?? []
    // En çok nitelikli izlenenden aza; eşitlikte toplam izlenme
    return [...list].sort((a, b) => b.qualifiedViews - a.qualifiedViews || b.views - a.views || a.title.localeCompare(b.title, 'tr'))
  }, [report, group, query])

  const poolStats = useMemo(() => {
    if (!report) return []
    return report.rules.pools.map((p) => {
      const items = report.items.filter((i) => i.pool === p.id && i.creatorId && i.program !== 'platform')
      const qualified = items.reduce((s, i) => s + i.qualifiedViews, 0)
      const minutes = items.reduce((s, i) => s + i.qualifiedSeconds, 0) / 60
      return { ...p, films: items.length, qualified, minutes, amount: round2((report.finance.distributable * p.rate) / 100), active: (report.rules.basis === 'views' ? qualified : minutes) > 0 }
    })
  }, [report])

  const total = rules?.pools.reduce((s, p) => s + p.rate, 0) ?? 0
  const creatorTotalAmount = report?.creators.reduce((s, c) => s + c.amount, 0) ?? 0
  const paidTotal = report?.creators.reduce((s, c) => s + (c.paidAmount ?? 0), 0) ?? 0
  const itemAmount = (profitShare: number) => (report ? round2((report.finance.distributable * profitShare) / 100) : 0)

  async function run(label: string, action: () => Promise<AccountingReport | void>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const next = await action()
      if (next) applyReport(next)
      if (label) setMessage(label)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    rules &&
    run('Oranlar kaydedildi. Açık ayın payları güncellendi; arşivler korunuyor.', async () => {
      await api('/api/admin/accounting/rules', { method: 'PUT', body: JSON.stringify(rules) })
      return (await api<{ report: AccountingReport }>('/api/admin/accounting/' + month)).report
    })

  const saveExpenses = () =>
    run('Giderler kaydedildi; dağıtılacak net ve hak edişler güncellendi.', async () => {
      const body = {
        expenseItems: drafts.filter((d) => d.label.trim() || d.amount.trim()).map((d) => ({ id: d.id, label: d.label.trim(), amount: d.amount.replace(',', '.') || '0' })),
        expenseNote,
      }
      return (await api<{ report: AccountingReport }>('/api/admin/accounting/' + month + '/finance', { method: 'PUT', body: JSON.stringify(body) })).report
    })

  const paid = (c: AccountingCreatorRow) => {
    const hint = c.payout.iban ? `${formatIban(c.payout.iban)} · ${c.payout.holder}` : 'IBAN girilmemiş'
    const reference = window.prompt(`${c.name} için ${tl(c.amount)} havalesini yaptıysanız dekont / açıklama referansını yazın.\n(${hint})\nBu işlem para transferi yapmaz, yalnızca kayıt tutar.`)
    if (!reference?.trim()) return
    void run('Ödeme kaydedildi.', async () =>
      (await api<{ report: AccountingReport }>('/api/admin/accounting/' + month + '/paid', { method: 'POST', body: JSON.stringify({ creatorId: c.id, reference }) })).report,
    )
  }
  const undoPaid = (c: AccountingCreatorRow) => {
    if (!window.confirm(`${c.name} için ödeme kaydı silinsin mi? Para hareketi yapılmaz; yalnızca "ödendi" işareti kalkar.`)) return
    void run('Ödeme kaydı geri alındı.', async () =>
      (await api<{ report: AccountingReport }>('/api/admin/accounting/' + month + '/paid/' + encodeURIComponent(c.id), { method: 'DELETE' })).report,
    )
  }

  function reportRows(): unknown[][] {
    if (!report) return []
    const f = report.finance
    return [
      ['Plooy aylık muhasebe', report.month, report.closedAt ? 'Arşiv' : 'Açık'],
      [],
      ['1 · GELİR'],
      ['Brüt tahsilat (TL)', f.grossRevenue, 'Ödenen sipariş', f.paidOrders, 'Aktif üye', f.activeSubscribers],
      ...f.revenueByPlan.map((p) => ['  ' + p.planName, p.count + ' ödeme', p.amount]),
      [],
      ['2 · GİDERLER'],
      ...f.expenseItems.map((i) => ['  ' + i.label, i.amount]),
      ['Gider toplamı (TL)', f.expenses, f.expenseNote],
      [],
      ['3 · DAĞITILACAK NET (TL)', f.distributable],
      ['Yapımcılara toplam (TL)', creatorTotalAmount, 'Plooy kalan (TL)', Math.max(0, f.distributable - creatorTotalAmount)],
      ['Havuz', 'Oran (%)', 'Havuz tutarı (TL)', 'Film', 'Nitelikli izlenme'],
      ...poolStats.map((p) => [p.label, p.rate, p.active ? p.amount : 0, p.films, p.qualified]),
      ['Plooy payı (%)', report.platformShare],
      [],
      ['4 · İZLENME RAPORU VE HAK EDİŞ', 'Eşik %' + report.rules.threshold, report.rules.basis === 'views' ? 'Nitelikli izlenme sayısına göre' : 'Nitelikli dakikaya göre'],
      ['Film', 'Grup', 'Yapımcı', 'Nitelikli izlenme', 'Toplam izlenme', 'Nitelikli dakika', 'Havuz', 'Havuz içi (%)', 'Kâr payı (%)', 'Hak ediş (TL)'],
      ...rows.map((i) => [i.title, groups[i.program], i.creatorName, i.qualifiedViews, i.views, round2(i.qualifiedSeconds / 60), report.rules.pools.find((p) => p.id === i.pool)?.label ?? 'Plooy', round2(i.poolShare), round2(i.profitShare), itemAmount(i.profitShare)]),
      [],
      ['5 · YAPIMCI ÖDEMELERİ'],
      ['Yapımcı', 'Kâr payı (%)', 'Tutar (TL)', 'IBAN', 'Hesap sahibi', 'Vergi/TC no', 'Ödeme tarihi', 'Ödenen tutar (TL)', 'Ödeme açıklaması'],
      ...report.creators.map((c) => [c.name, round2(c.share), c.amount, c.payout.iban, c.payout.holder, c.payout.taxId, c.paidAt ?? 'Ödenmedi', c.paidAmount ?? '', c.reference]),
    ]
  }

  function csv() {
    const cell = (v: unknown) => {
      let s = String(v ?? '')
      if (/^[\s]*[=+@-]/.test(s)) s = "'" + s
      return '"' + s.replace(/"/g, '""') + '"'
    }
    const blob = new Blob(['﻿' + reportRows().map((r) => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Plooy-muhasebe-' + month + '.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function print() {
    const w = window.open('', '_blank')
    if (!w) {
      setError('Yazdırmak için açılır pencereye izin verin.')
      return
    }
    w.document.write(
      '<html><head><title>Plooy ' + safe(month) + '</title><style>body{font:12px Arial;color:#111}table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:5px}tr{break-inside:avoid}@page{size:landscape}</style></head><body><h1>Plooy aylık muhasebe — ' +
        safe(month) +
        '</h1><table>' +
        reportRows().map((r) => '<tr>' + r.map((c) => '<td>' + safe(c) + '</td>').join('') + '</tr>').join('') +
        '</table></body></html>',
    )
    w.document.close()
    w.focus()
    w.print()
  }

  const updateDraft = (id: string, patch: Partial<ExpenseDraft>) => {
    setDrafts((current) => current.map((d) => (d.id === id ? { ...d, ...patch } : d)))
    setDirty(true)
  }

  return (
    <div className="space-y-8 text-white">
      <div>
        <h1 className="text-2xl font-bold">Muhasebe</h1>
        <p className="mt-1 max-w-4xl text-sm text-plooy-muted">
          Akış: <strong className="text-white/90">Gelir</strong> (üyelik tahsilatı) − <strong className="text-white/90">Giderler</strong> (ofis, CDN, vergi, çalışan, kira…) ={' '}
          <strong className="text-white/90">Dağıtılacak net</strong>. Net, havuz oranlarına göre türlere dağıtılır; her filmin hak edişi nitelikli izlenmesine göre hesaplanır. Ay bitince önceki ay otomatik arşivlenir ve kilitlenir.
        </p>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300">{message}</p>}

      <div className="flex flex-wrap gap-3">
        <select aria-label="Muhasebe ayı" className={field} disabled={busy} value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m.month} value={m.month}>{m.month} · {m.closed_at ? 'Arşiv (kilitli)' : 'Açık ay'}</option>
          ))}
        </select>
        <select aria-label="Yapımcı grubu" className={field} value={group} onChange={(e) => setGroup(e.target.value)}>
          {Object.entries(groups).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input aria-label="Film veya yapımcı ara" className={field} placeholder="Film veya yapımcı ara..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className={button} disabled={!report || loading} onClick={csv}>Excel / CSV indir</button>
        <button className={button} disabled={!report || loading} onClick={print}>Yazdır / PDF</button>
      </div>
      {loading && <p>Rapor yükleniyor…</p>}

      {report && finance && (
        <>
          <ArrangeableGrid
            layoutKey="accounting-summary"
            items={[
              { id: 'gross', node: <div className={card}><p className="text-xs text-plooy-muted">Gelir (tahsilat)</p><p className="text-2xl font-bold">{tl(finance.grossRevenue)}</p><p className="text-xs text-plooy-muted">{finance.paidOrders} ödeme · {finance.activeSubscribers} aktif üye</p></div> },
              { id: 'expenses', node: <div className={card}><p className="text-xs text-plooy-muted">Giderler</p><p className="text-2xl font-bold text-red-200">− {tl(finance.expenses)}</p><p className="text-xs text-plooy-muted">{finance.expenseItems.length} kalem</p></div> },
              { id: 'net', node: <div className={card + ' border-plooy-gold/40 bg-plooy-gold/10'}><p className="text-xs text-plooy-muted">Dağıtılacak net</p><p className="text-2xl font-bold text-plooy-gold">{tl(finance.distributable)}</p><p className="text-xs text-plooy-muted">= gelir − giderler</p></div> },
              { id: 'split', node: <div className={card}><p className="text-xs text-plooy-muted">Yapımcılara toplam</p><p className="text-2xl font-bold">{tl(creatorTotalAmount)}</p><p className="text-xs text-plooy-muted">Plooy'a kalan {tl(Math.max(0, finance.distributable - creatorTotalAmount))}{paidTotal > 0 ? ` · ödenen ${tl(paidTotal)}` : ''}</p></div> },
            ]}
          />

          <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0d0f14] p-5">
            <Step n={1} title="Gelir" hint="Bu ay başarıyla ödenen üyelikler otomatik toplanır. Hediye ve davet kodlarıyla açılan üyelikler gelir sayılmaz; para sisteme girmez." />
            <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
              <p className="text-3xl font-bold">{tl(finance.grossRevenue)}</p>
              <div className="text-sm">
                {finance.revenueByPlan.length === 0 ? (
                  <p className="text-plooy-muted">Bu ay ödeme alınmadı.</p>
                ) : (
                  <table className="text-left">
                    <tbody>
                      {finance.revenueByPlan.map((p) => (
                        <tr key={p.planId}>
                          <td className="pr-4 text-white/90">{p.planName}</td>
                          <td className="pr-4 text-plooy-muted">{p.count} ödeme</td>
                          <td className="text-right">{tl(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="mt-2 text-xs text-plooy-muted">Şu an aktif üye: {finance.activeSubscribers}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0d0f14] p-5">
            <Step n={2} title="Giderler" hint="Ayın giderlerini kalem kalem girin. Toplam, gelirden düşülür. Ödeme kaydı olan ayda giderler kilitlenir." />
            <fieldset disabled={busy || finance.locked} className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {EXPENSE_PRESETS.map((label) => (
                  <button key={label} type="button" className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10" onClick={() => { setDrafts((c) => [...c, newDraft(label)]); setDirty(true) }}>
                    + {label}
                  </button>
                ))}
                <button type="button" className="rounded-full border border-white/20 px-3 py-1 text-xs" onClick={() => { setDrafts((c) => [...c, newDraft()]); setDirty(true) }}>
                  + Boş kalem
                </button>
              </div>
              {drafts.length === 0 && <p className="text-sm text-plooy-muted">Henüz gider kalemi yok. Yukarıdan ekleyin.</p>}
              <div className="space-y-2">
                {drafts.map((d, index) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-2">
                    <span className="w-5 text-right text-xs text-plooy-muted">{index + 1}.</span>
                    <input list="expense-presets" aria-label="Gider adı" className={field + ' min-w-[14rem] flex-1'} placeholder="Gider adı (ör. Ofis kirası)" maxLength={80} value={d.label} onChange={(e) => updateDraft(d.id, { label: e.target.value })} />
                    <input aria-label="Tutar (TL)" inputMode="decimal" className={field + ' w-36 text-right'} placeholder="0,00" value={d.amount} onChange={(e) => updateDraft(d.id, { amount: e.target.value })} />
                    <span className="text-sm text-plooy-muted">TL</span>
                    <button type="button" className="text-xs text-red-300 hover:underline" onClick={() => { setDrafts((c) => c.filter((x) => x.id !== d.id)); setDirty(true) }}>Kaldır</button>
                  </div>
                ))}
              </div>
              <datalist id="expense-presets">{EXPENSE_PRESETS.map((l) => <option key={l} value={l} />)}</datalist>
              <input className={field + ' w-full'} maxLength={500} placeholder="Not (isteğe bağlı): fatura numaraları, açıklama…" value={expenseNote} onChange={(e) => { setExpenseNote(e.target.value); setDirty(true) }} />
              <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-3">
                <p className="text-sm">Gider toplamı: <strong className="text-red-200">{tl(draftTotal)}</strong></p>
                <p className="text-sm">Dağıtılacak net: <strong className="text-plooy-gold">{tl(previewNet)}</strong>{dirty && <span className="ml-1 text-xs text-amber-300">(kaydedilmedi)</span>}</p>
                <button type="button" className={button + ' ml-auto bg-plooy-gold text-black'} onClick={() => void saveExpenses()}>Giderleri kaydet</button>
              </div>
            </fieldset>
            {finance.locked && <p className="text-xs text-amber-300">Bu ay için ödeme kaydı var; giderleri değiştirmek için 5. adımdaki ödemeleri geri alın.</p>}
            {finance.updatedAt && <p className="text-xs text-plooy-muted">Son güncelleme: {new Date(finance.updatedAt).toLocaleString('tr-TR')}</p>}
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0d0f14] p-5">
            <Step n={3} title="Dağıtılacak net ve havuzlar" hint="Net kâr, aşağıdaki oranlarla türlere ayrılır. İzlenmesi olmayan havuzun payı Plooy'da kalır." />
            <p className="text-lg">
              {tl(finance.grossRevenue)} <span className="text-plooy-muted">gelir</span> − {tl(finance.expenses)} <span className="text-plooy-muted">gider</span> ={' '}
              <strong className="text-plooy-gold">{tl(finance.distributable)}</strong> <span className="text-plooy-muted">dağıtılacak net</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {poolStats.map((p) => (
                <div key={p.id} className={`${card} ${p.active ? '' : 'opacity-60'}`}>
                  <p className="text-xs text-plooy-muted">{p.label}</p>
                  <p className="text-lg font-bold">{pct(p.rate)} <span className="text-sm font-normal text-plooy-gold">{tl(p.amount)}</span></p>
                  <p className="text-xs text-plooy-muted">{p.active ? `${p.films} film · ${p.qualified} nitelikli izlenme` : "İzlenme yok · pay Plooy'da kalır"}</p>
                </div>
              ))}
              <div className={card + ' border-white/20'}>
                <p className="text-xs text-plooy-muted">Plooy payı (boş havuzlar dahil)</p>
                <p className="text-lg font-bold">{pct(report.platformShare)} <span className="text-sm font-normal text-plooy-gold">{tl(Math.max(0, finance.distributable - creatorTotalAmount))}</span></p>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0d0f14] p-5">
            <Step n={4} title="İzlenme raporu ve hak ediş" hint={`En çok nitelikli izlenenden aza sıralı. Nitelikli izlenme: sürenin %${report.rules.threshold}'i izlenmiş, aynı üye için 48 saatte bir kez. Hak ediş = kâr payı × dağıtılacak net.`} />
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-plooy-muted">
                  <tr>{['#', 'Film', 'Yapımcı', 'Havuz', 'Nitelikli izlenme ↓', 'Toplam izlenme', 'Nitelikli dk', 'Havuz içi pay', 'Kâr payı', 'Hak ediş'].map((t) => <th key={t} className="whitespace-nowrap p-3 font-medium">{t}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((i, n) => {
                    const isPlatform = !i.creatorId || i.program === 'platform'
                    return (
                      <tr key={i.contentId + n} className="border-t border-white/10">
                        <td className="p-3 text-plooy-muted">{n + 1}</td>
                        <td className="p-3 font-medium">{i.title}</td>
                        <td className="p-3">{isPlatform ? 'Plooy' : i.creatorName}</td>
                        <td className="p-3 text-plooy-muted">{isPlatform ? 'Plooy içeriği' : report.rules.pools.find((p) => p.id === i.pool)?.label ?? i.pool}</td>
                        <td className="p-3 text-lg font-bold text-emerald-300">{i.qualifiedViews}</td>
                        <td className="p-3">{i.views}</td>
                        <td className="p-3">{(i.qualifiedSeconds / 60).toFixed(1)}</td>
                        <td className="p-3">{isPlatform ? '—' : pct(i.poolShare)}</td>
                        <td className="p-3">{isPlatform ? '—' : pct(i.profitShare)}</td>
                        <td className="p-3 font-semibold text-plooy-gold">{isPlatform ? '—' : tl(itemAmount(i.profitShare))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!rows.length && <p className="p-4 text-plooy-muted">Bu ay ve filtrede izlenme kaydı yok.</p>}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0d0f14] p-5">
            <Step n={5} title="Yapımcı ödemeleri" hint="Havaleyi bankanızdan yapımcının IBAN'ına yaptıktan sonra 'ödendi' işaretleyin; tutar ve IBAN o anki haliyle kayda geçer. Bu düğmeler para transferi yapmaz. Yalnızca arşivlenen (kilitli) ayda işaretlenebilir." />
            <div className="space-y-2">
              {report.creators.length === 0 && <p className="text-sm text-plooy-muted">Bu ay pay hak eden yapımcı yok.</p>}
              {report.creators.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-[#11141c] p-3">
                  <div className="min-w-[12rem]">
                    <p className="font-medium">{c.name}</p>
                    {c.payout.iban ? (
                      <p className="font-mono text-xs text-plooy-muted">{formatIban(c.payout.iban)}{c.payout.holder ? ` · ${c.payout.holder}` : ''}</p>
                    ) : (
                      <p className="text-xs text-amber-300">IBAN girilmemiş — yapımcı panelden ekler</p>
                    )}
                    {c.payout.taxId && <p className="text-xs text-plooy-muted">Vergi/TC no: {c.payout.taxId}{c.payout.taxOffice ? ` · ${c.payout.taxOffice}` : ''}</p>}
                  </div>
                  <span className="text-sm text-plooy-muted">kâr payı</span>
                  <strong>{pct(c.share)}</strong>
                  <span className="text-lg font-bold text-plooy-gold">{finance.distributable > 0 ? tl(c.amount) : 'net 0'}</span>
                  {c.paidAt ? (
                    <span className="flex flex-wrap items-center gap-2 text-emerald-300">
                      Ödendi · {new Date(c.paidAt).toLocaleDateString('tr-TR')}{c.paidAmount !== null ? ` · ${tl(c.paidAmount)}` : ''} · {c.reference}
                      {c.paidIban && c.paidIban !== c.payout.iban && <span className="text-xs text-amber-300">(ödeme anındaki IBAN: {formatIban(c.paidIban)})</span>}
                      <button className={button + ' text-xs text-white'} disabled={busy} onClick={() => undoPaid(c)}>Geri al</button>
                    </span>
                  ) : (
                    <button className={button + ' ml-auto'} disabled={busy || !report.closedAt || c.share <= 0} title={!report.closedAt ? 'Ay kapanınca işaretlenebilir' : ''} onClick={() => paid(c)}>
                      Ödendi işaretle
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {rules && (
        <details className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
          <summary className="cursor-pointer font-semibold">Ayarlar: havuz oranları ve nitelikli izlenme eşiği</summary>
          <fieldset disabled={busy} className="mt-4 space-y-4">
            <p className="text-sm text-plooy-muted">
              Oranlar dağıtılacak netin yüzdesidir; toplamı %100'ü aşamaz, kalan Plooy'a kalır. Değişiklik açık aya uygulanır, arşiv değişmez. %0 olan türlerin yapımcıları pay almaz. Güncel oranlar yapımcı sözleşmesinin sonuna otomatik eklenir.
            </p>
            <div className="flex flex-wrap gap-4">
              <label>
                Nitelikli izlenme eşiği (%)
                <input type="number" min="1" max="100" value={rules.threshold} onChange={(e) => setRules({ ...rules, threshold: Number(e.target.value) })} className={field + ' block w-28'} />
              </label>
              <label>
                Paylaştırma yöntemi
                <select className={field + ' block'} value={rules.basis} onChange={(e) => setRules({ ...rules, basis: e.target.value as AccountingRules['basis'] })}>
                  <option value="views">Nitelikli izlenme sayısı</option>
                  <option value="minutes">Nitelikli izlenen dakika</option>
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {rules.pools.map((p, index) => (
                <div key={p.id} className="rounded border border-white/10 p-3">
                  <label className="block">
                    {p.label}
                    <input aria-label={p.label + ' payı'} type="number" min="0" max="100" step="0.01" value={p.rate} className={field + ' ml-2 w-24'} onChange={(e) => setRules({ ...rules, pools: rules.pools.map((v, j) => (j === index ? { ...v, rate: Number(e.target.value) } : v)) })} />%
                  </label>
                  {p.categoryId && (
                    <div className="mt-2 flex gap-2">
                      <button type="button" className={button} disabled={index === 0} onClick={() => { const list = [...rules.pools]; [list[index - 1], list[index]] = [list[index], list[index - 1]]; setRules({ ...rules, pools: list }) }}>Önceliği artır</button>
                      <button type="button" className={button} onClick={() => setRules({ ...rules, pools: rules.pools.filter((v) => v.id !== p.id) })}>Kaldır</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Özel muhasebe kategorisi" className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Kategori seç</option>
                {categories.filter((c) => !rules.pools.some((p) => p.categoryId === c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button type="button" className={button} disabled={!category} onClick={() => { const c = categories.find((c) => c.id === category)!; setRules({ ...rules, pools: [{ id: 'custom_' + crypto.randomUUID(), categoryId: c.id, label: c.title, rate: 0 }, ...rules.pools] }); setCategory('') }}>
                Kategori havuzu ekle
              </button>
            </div>
            <p className="text-xs text-plooy-muted">Özel kategoriler içerik türünden önce uygulanır; bir film birden fazla özel kategorideyse üstteki kazanır. Aynı film iki kez pay almaz.</p>
            <p className={total > 100 ? 'text-red-300' : 'text-plooy-gold'}>Ayrılan: {pct(total)} · Plooy temel payı: {pct(100 - total)}</p>
            <button type="button" className={button} disabled={total > 100} onClick={() => void save()}>Oranları kaydet</button>
          </fieldset>
        </details>
      )}

      <button className={button} onClick={() => setLegacy(!legacy)}>{legacy ? 'Eski raporları kapat' : 'Önceki sistemin izlenme raporları'}</button>
      {legacy && <LegacyWatchAccountingPage />}
    </div>
  )
}
