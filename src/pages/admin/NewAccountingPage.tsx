import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { AccountingRules, AccountingReport, AccountingCreatorRow } from '../../../shared/accounting'
import { LegacyWatchAccountingPage } from './LegacyWatchAccountingPage'

const groups: Record<string, string> = { all: 'Tümü', platform: 'Plooy', standard: 'Bağımsız yapımcı', student_cinema: 'Genç Sinema' }
const field = 'rounded-lg border border-white/20 bg-[#11141c] px-3 py-2 text-white'
const button = 'rounded-lg border border-white/20 px-3 py-2 disabled:opacity-40'
const pct = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 4 }) + '%'
const tl = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })
const safe = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const formatIban = (iban: string) => iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()

type FinanceForm = { expenses: string; expenseNote: string; netOverride: string }

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
  const [finance, setFinance] = useState<FinanceForm>({ expenses: '0', expenseNote: '', netOverride: '' })

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
    setFinance({
      expenses: String(next.finance.expenses),
      expenseNote: next.finance.expenseNote,
      netOverride: next.finance.netOverride === null ? '' : String(next.finance.netOverride),
    })
  }

  const rows = useMemo(
    () =>
      report?.items.filter(
        (i) =>
          (group === 'all' || i.program === group) &&
          (i.title + ' ' + i.creatorName).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
      ) ?? [],
    [report, group, query],
  )
  const total = rules?.pools.reduce((s, p) => s + p.rate, 0) ?? 0
  const creatorTotalAmount = report?.creators.reduce((s, c) => s + c.amount, 0) ?? 0
  const paidTotal = report?.creators.reduce((s, c) => s + (c.paidAmount ?? 0), 0) ?? 0

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
    run('Oranlar kaydedildi. Açık ayın payları güncellendi; arşivler korunuyor. Yeni eşik, yeni izleme pencerelerinde geçerli.', async () => {
      await api('/api/admin/accounting/rules', { method: 'PUT', body: JSON.stringify(rules) })
      return (await api<{ report: AccountingReport }>('/api/admin/accounting/' + month)).report
    })

  const saveFinance = () =>
    run('Ayın gider ve net bilgisi kaydedildi; yapımcı tutarları güncellendi.', async () => {
      const body = {
        expenses: Number(finance.expenses.replace(',', '.')) || 0,
        expenseNote: finance.expenseNote,
        netOverride: finance.netOverride.trim() === '' ? null : Number(finance.netOverride.replace(',', '.')),
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
      ['Yeni sayaç başlangıcı', report.startedAt],
      ['Dağıtım yöntemi', report.rules.basis === 'views' ? 'Nitelikli izlenme sayısı' : 'Nitelikli dakika'],
      ['Kayıtlarda uygulanan eşikler', report.thresholds.join(', ')],
      ['Ayın son eşik ayarı', report.rules.threshold],
      [],
      ['Brüt tahsilat (TL)', f.grossRevenue, 'Ödenen sipariş', f.paidOrders],
      ['Gider / kesinti (TL)', f.expenses, f.expenseNote],
      ['Elle girilen net (TL)', f.netOverride ?? ''],
      ['Dağıtılabilir net (TL)', f.distributable],
      ['Yapımcılara toplam (TL)', creatorTotalAmount, 'Plooy kalan (TL)', Math.max(0, f.distributable - creatorTotalAmount)],
      [],
      ['Kategori', 'Ayrılan pay (%)'],
      ...report.rules.pools.map((p) => [p.label, p.rate]),
      ['Plooy kalan pay (%)', report.platformShare],
      [],
      ['Film', 'Grup', 'Yapımcı', 'İzlenme', 'Nitelikli izlenme', 'Nitelikli dakika', 'Havuz', 'Havuz içi (%)', 'Toplam kar payı (%)'],
      ...rows.map((i) => [i.title, groups[i.program], i.creatorName, i.views, i.qualifiedViews, i.qualifiedSeconds / 60, report.rules.pools.find((p) => p.id === i.pool)?.label ?? 'Plooy', i.poolShare, i.profitShare]),
      [],
      ['Yapımcı', 'Kar payı (%)', 'Tutar (TL)', 'IBAN', 'Hesap sahibi', 'Vergi/TC no', 'Ödeme tarihi', 'Ödenen tutar (TL)', 'Ödeme açıklaması'],
      ...report.creators.map((c) => [c.name, c.share, c.amount, c.payout.iban, c.payout.holder, c.payout.taxId, c.paidAt ?? 'Ödenmedi', c.paidAmount ?? '', c.reference]),
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

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-bold">Muhasebe</h1>
      <p className="text-sm text-plooy-muted">
        Her ay İstanbul saatine göre önceki ay arşivlenir. Aynı üye aynı içerik için 48 saatte bir sayılır (hangi ağdan izlediği fark etmez); aynı internet bağlantısından en fazla 3 farklı hesap sayılır. Dizi bölümleri ayrı değerlendirilir. Paylar nitelikli izlenmeler üzerinden, tutarlar dağıtılabilir net kâr üzerinden hesaplanır.
      </p>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {message && <p role="status" className="text-emerald-300">{message}</p>}

      {rules && (
        <details className="rounded-xl border border-white/10 bg-[#11141c] p-4">
          <summary className="cursor-pointer font-semibold">Oranları ve nitelikli izlenme eşiğini düzenle</summary>
          <fieldset disabled={busy} className="mt-4 space-y-4">
            <p className="text-sm text-plooy-muted">
              Değişiklik açık ayın dağıtımına uygulanır. Arşiv değişmez. İzlenmesi olmayan havuzun payı Plooy'da kalır. Temel türlerin payını sıfırlayabilirsiniz. Ayrı havuz olarak eklenen Dizi, Stand-up ve Dikey dizi başlangıçta %0; bu türlerin yapımcıları pay almaz, istediğiniz payları buradan belirleyin. Güncel oranlar yapımcı sözleşmesinin sonuna otomatik eklenir.
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
                      <button type="button" className={button} disabled={index === 0} onClick={() => { const list = [...rules.pools]; [list[index - 1], list[index]] = [list[index], list[index - 1]]; setRules({ ...rules, pools: list }) }}>
                        Önceliği artır
                      </button>
                      <button type="button" className={button} onClick={() => setRules({ ...rules, pools: rules.pools.filter((v) => v.id !== p.id) })}>
                        Kaldır
                      </button>
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
            <p className="text-xs text-plooy-muted">
              Özel kategoriler içerik türünden önce uygulanır; bir film birden fazla özel kategorideyse üstteki kazanır. Genç Sinema kendi havuzunda, Plooy içerikleri ayrı kalır. Böylece aynı film iki kez pay almaz. Kategori üyeliği izlenme anında kaydedilir.
            </p>
            <p className={total > 100 ? 'text-red-300' : 'text-plooy-gold'}>Ayrılan: {pct(total)} · Plooy temel payı: {pct(100 - total)}</p>
            <button type="button" className={button} disabled={total > 100} onClick={() => void save()}>
              Oranları kaydet
            </button>
          </fieldset>
        </details>
      )}

      <div className="flex flex-wrap gap-3">
        <select aria-label="Muhasebe ayı" className={field} disabled={busy} value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m.month} value={m.month}>{m.month} · {m.closed_at ? 'Arşiv' : 'Açık ay'}</option>
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

      {report && (
        <>
          <p className="text-sm text-plooy-muted">
            Yeni 48 saat sayacı {new Date(report.startedAt).toLocaleDateString('tr-TR')} tarihinde başlar. Önceki kayıtlar aşağıdaki eski raporlardadır. {report.closedAt ? 'Bu ayın oranları ve izlenmeleri kilitlidir.' : 'Açık ayın verileri değişebilir.'}
          </p>

          <section className="rounded-xl border border-plooy-gold/30 bg-[#11141c] p-4">
            <h2 className="text-lg font-bold">Ayın para özeti</h2>
            <p className="mt-1 text-xs text-plooy-muted">
              Brüt tahsilat, bu ay başarıyla ödenen abonelik siparişlerinden otomatik gelir (hediye ve davet kodları gelir sayılmaz). Gider ve kesintileri siz girersiniz; dağıtılabilir net = tahsilat − gider. Farklı bir net kullanmak isterseniz elle girin. Bu ekran para transferi yapmaz.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded border border-white/10 p-3"><p className="text-xs text-plooy-muted">Brüt tahsilat</p><p className="text-xl font-bold">{tl(report.finance.grossRevenue)}</p><p className="text-xs text-plooy-muted">{report.finance.paidOrders} ödenen sipariş</p></div>
              <div className="rounded border border-white/10 p-3"><p className="text-xs text-plooy-muted">Gider / kesinti</p><p className="text-xl font-bold">{tl(report.finance.expenses)}</p>{report.finance.expenseNote && <p className="truncate text-xs text-plooy-muted" title={report.finance.expenseNote}>{report.finance.expenseNote}</p>}</div>
              <div className="rounded border border-plooy-gold/40 bg-plooy-gold/10 p-3"><p className="text-xs text-plooy-muted">Dağıtılabilir net</p><p className="text-xl font-bold text-plooy-gold">{tl(report.finance.distributable)}</p>{report.finance.netOverride !== null && <p className="text-xs text-plooy-muted">elle girildi</p>}</div>
              <div className="rounded border border-white/10 p-3"><p className="text-xs text-plooy-muted">Yapımcılara toplam</p><p className="text-xl font-bold">{tl(creatorTotalAmount)}</p><p className="text-xs text-plooy-muted">Plooy'da kalan: {tl(Math.max(0, report.finance.distributable - creatorTotalAmount))}{paidTotal > 0 ? ` · ödenen: ${tl(paidTotal)}` : ''}</p></div>
            </div>
            <fieldset disabled={busy || report.finance.locked} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                Gider / kesinti (TL)
                <input inputMode="decimal" value={finance.expenses} onChange={(e) => setFinance({ ...finance, expenses: e.target.value })} className={field + ' block w-40'} />
              </label>
              <label className="min-w-[16rem] flex-1 text-sm">
                Gider açıklaması
                <input maxLength={500} value={finance.expenseNote} onChange={(e) => setFinance({ ...finance, expenseNote: e.target.value })} className={field + ' block w-full'} placeholder="Sunucu, CDN, sanal pos komisyonu, vergi…" />
              </label>
              <label className="text-sm">
                Elle net (isteğe bağlı, TL)
                <input inputMode="decimal" value={finance.netOverride} onChange={(e) => setFinance({ ...finance, netOverride: e.target.value })} className={field + ' block w-40'} placeholder="boş = otomatik" />
              </label>
              <button type="button" className={button} onClick={() => void saveFinance()}>Para özetini kaydet</button>
            </fieldset>
            {report.finance.locked && <p className="mt-2 text-xs text-amber-300">Bu ay için ödeme kaydı var; gider ve net değiştirmek için önce ilgili ödemeleri geri alın.</p>}
            {report.finance.updatedAt && <p className="mt-1 text-xs text-plooy-muted">Son güncelleme: {new Date(report.finance.updatedAt).toLocaleString('tr-TR')}</p>}
          </section>

          <div className="flex flex-wrap gap-3">
            {report.rules.pools.map((p) => (
              <span key={p.id} className="rounded bg-white/5 px-3 py-2">{p.label}: {pct(p.rate)}</span>
            ))}
            <span className="rounded bg-plooy-gold/10 px-3 py-2">Plooy (boş havuzlar dahil): {pct(report.platformShare)}</span>
          </div>
          <p className="text-sm">
            Dağıtım: {report.rules.basis === 'views' ? 'nitelikli izlenme sayısı' : 'nitelikli dakika'} · Eşik: %{report.rules.threshold}
            {report.thresholds.length > 0 ? ' · Bu ay uygulanan eşikler: ' + report.thresholds.map((n) => '%' + n).join(', ') : ''}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>{['Film', 'Grup', 'Yapımcı', 'İzlenme ↓', 'Nitelikli', 'Nitelikli dk', 'Havuz içi pay', 'Kar payı'].map((t) => <th key={t} className="p-3">{t}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((i, n) => (
                  <tr key={i.contentId + n} className="border-t border-white/10">
                    <td className="p-3">{i.title}</td>
                    <td className="p-3">{groups[i.program]}</td>
                    <td className="p-3">{i.creatorName}</td>
                    <td className="p-3">{i.views}</td>
                    <td className="p-3">{i.qualifiedViews}</td>
                    <td className="p-3">{(i.qualifiedSeconds / 60).toFixed(1)}</td>
                    <td className="p-3">{pct(i.poolShare)}</td>
                    <td className="p-3 text-plooy-gold">{pct(i.profitShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="p-4 text-plooy-muted">Bu filtrede izlenme kaydı yok.</p>}
          </div>

          <h2 className="text-xl font-bold">Yapımcı ödemeleri</h2>
          <p className="text-sm text-plooy-muted">
            Tutar = kâr payı × dağıtılabilir net. Havaleyi bankanızdan yapımcının IBAN'ına yaptıktan sonra "ödendi" işaretleyin; tutar ve IBAN o anki haliyle kayda geçer. Bu düğmeler para transferi yapmaz. Yanlış işaretlediyseniz geri alabilirsiniz.
          </p>
          <div className="space-y-2">
            {report.creators.length === 0 && <p className="text-sm text-plooy-muted">Bu ay pay hak eden yapımcı yok.</p>}
            {report.creators.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-white/10 p-3">
                <div className="min-w-[12rem]">
                  <p className="font-medium">{c.name}</p>
                  {c.payout.iban ? (
                    <p className="font-mono text-xs text-plooy-muted">{formatIban(c.payout.iban)}{c.payout.holder ? ` · ${c.payout.holder}` : ''}</p>
                  ) : (
                    <p className="text-xs text-amber-300">IBAN girilmemiş — yapımcı panelden ekler</p>
                  )}
                  {c.payout.taxId && <p className="text-xs text-plooy-muted">Vergi/TC no: {c.payout.taxId}{c.payout.taxOffice ? ` · ${c.payout.taxOffice}` : ''}</p>}
                </div>
                <strong>{pct(c.share)}</strong>
                <span className="text-plooy-gold">{report.finance.distributable > 0 ? tl(c.amount) : 'net girilmedi'}</span>
                {c.paidAt ? (
                  <span className="flex flex-wrap items-center gap-2 text-emerald-300">
                    Ödendi · {new Date(c.paidAt).toLocaleDateString('tr-TR')}{c.paidAmount !== null ? ` · ${tl(c.paidAmount)}` : ''} · {c.reference}
                    {c.paidIban && c.paidIban !== c.payout.iban && <span className="text-xs text-amber-300">(ödeme anındaki IBAN: {formatIban(c.paidIban)})</span>}
                    <button className={button + ' text-xs text-white'} disabled={busy} onClick={() => undoPaid(c)}>Geri al</button>
                  </span>
                ) : (
                  <button className={button} disabled={busy || !report.closedAt || c.share <= 0} title={!report.closedAt ? 'Ay kapanınca işaretlenebilir' : ''} onClick={() => paid(c)}>
                    Ödendi işaretle
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <button className={button} onClick={() => setLegacy(!legacy)}>{legacy ? 'Eski raporları kapat' : 'Önceki sistemin izlenme raporları'}</button>
      {legacy && <LegacyWatchAccountingPage />}
    </div>
  )
}
