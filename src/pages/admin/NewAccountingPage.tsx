import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { AccountingRules, AccountingReport } from '../../../shared/accounting'
import { LegacyWatchAccountingPage } from './LegacyWatchAccountingPage'
const groups:Record<string,string>={all:'Tümü',platform:'Plooy',standard:'Bağımsız yapımcı',student_cinema:'Genç Sinema'}
const field='rounded-lg border border-white/20 bg-[#11141c] px-3 py-2 text-white'
const button='rounded-lg border border-white/20 px-3 py-2 disabled:opacity-40'
const pct=(n:number)=>n.toLocaleString('tr-TR',{maximumFractionDigits:4})+'%'
const safe=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function AdminWatchAccountingPage(){
 const [rules,setRules]=useState<AccountingRules|null>(null)
 const [months,setMonths]=useState<{month:string;closed_at:string|null}[]>([])
 const [categories,setCategories]=useState<{id:string;title:string}[]>([])
 const [month,setMonth]=useState(''),[report,setReport]=useState<AccountingReport|null>(null)
 const [group,setGroup]=useState('all'),[query,setQuery]=useState(''),[category,setCategory]=useState('')
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false)
 const [legacy,setLegacy]=useState(false)
 useEffect(()=>{let live=true; api<{rules:AccountingRules;months:typeof months;categories:typeof categories}>('/api/admin/accounting').then(d=>{if(live){setRules(d.rules);setMonths(d.months);setCategories(d.categories);setMonth(d.months[0]?.month??'')}}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[])
 useEffect(()=>{if(!month)return;let live=true;setLoading(true);setReport(null);setError('');api<{report:AccountingReport}>('/api/admin/accounting/'+month).then(d=>{if(live)setReport(d.report)}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[month])
 const rows=useMemo(()=>report?.items.filter(i=>(group==='all'||i.program===group)&&(i.title+' '+i.creatorName).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')))??[],[report,group,query])
 const total=rules?.pools.reduce((s,p)=>s+p.rate,0)??0
 async function save(){
  if(!rules)return;setBusy(true);setError('');setMessage('')
  try{await api('/api/admin/accounting/rules',{method:'PUT',body:JSON.stringify(rules)});const d=await api<{report:AccountingReport}>('/api/admin/accounting/'+month);setReport(d.report);setMessage('Oranlar kaydedildi. Açık ayın payları güncellendi; arşivler korunuyor. Yeni eşik, yeni izleme pencerelerinde geçerli.')}
  catch(e){setError(e instanceof Error?e.message:'Kaydedilemedi.')}finally{setBusy(false)}
 }
 async function paid(id:string){
  const reference=window.prompt('Yaptığınız ödemenin açıklaması / dekont referansı:');if(!reference?.trim())return
  setBusy(true);setError('')
  try{const d=await api<{report:AccountingReport}>('/api/admin/accounting/'+month+'/paid',{method:'POST',body:JSON.stringify({creatorId:id,reference})});setReport(d.report)}
  catch(e){setError(e instanceof Error?e.message:'Kaydedilemedi.')}finally{setBusy(false)}
 }
 function reportRows():unknown[][]{
  if(!report)return[]
  return [
   ['Plooy aylık muhasebe',report.month,report.closedAt?'Arşiv':'Açık'],
   ['Yeni sayaç başlangıcı',report.startedAt],['Dağıtım yöntemi',report.rules.basis==='views'?'Nitelikli izlenme sayısı':'Nitelikli dakika'],
   ['Kayıtlarda uygulanan eşikler',report.thresholds.join(', ')],['Ayın son eşik ayarı',report.rules.threshold],
   ['Kategori','Ayrılan pay (%)'],...report.rules.pools.map(p=>[p.label,p.rate]),['Plooy kalan pay (%)',report.platformShare],
   [],['Film','Grup','Yapımcı','İzlenme','Nitelikli izlenme','Nitelikli dakika','Havuz','Havuz içi (%)','Toplam kar payı (%)'],
   ...rows.map(i=>[i.title,groups[i.program],i.creatorName,i.views,i.qualifiedViews,i.qualifiedSeconds/60,report.rules.pools.find(p=>p.id===i.pool)?.label??'Plooy',i.poolShare,i.profitShare]),
   [],['Yapımcı','Kar payı (%)','Ödeme tarihi','Ödeme açıklaması'],...report.creators.map(c=>[c.name,c.share,c.paidAt??'Ödenmedi',c.reference])
  ]
 }
 function csv(){
  const cell=(v:unknown)=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  const blob=new Blob(['\uFEFF'+reportRows().map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8;'})
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Plooy-muhasebe-'+month+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 function print(){
  const w=window.open('','_blank');if(!w){setError('Yazdırmak için açılır pencereye izin verin.');return}
  w.document.write('<html><head><title>Plooy '+safe(month)+'</title><style>body{font:12px Arial;color:#111}table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:5px}tr{break-inside:avoid}@page{size:landscape}</style></head><body><h1>Plooy aylık muhasebe — '+safe(month)+'</h1><table>'+reportRows().map(r=>'<tr>'+r.map(c=>'<td>'+safe(c)+'</td>').join('')+'</tr>').join('')+'</table></body></html>')
  w.document.close();w.focus();w.print()
 }
 return <div className="space-y-6 text-white">
  <h1 className="text-2xl font-bold">Muhasebe</h1>
  <p className="text-sm text-plooy-muted">Her ay İstanbul saatine göre önceki ay arşivlenir. Aynı film, üye veya IP başına 48 saatte bir sayılır; dizi bölümleri ayrı değerlendirilir. Paylar nitelikli izlenmeler üzerinden hesaplanır.</p>
  {error&&<p role="alert" className="text-red-300">{error}</p>}{message&&<p role="status" className="text-emerald-300">{message}</p>}
  {rules&&<details className="rounded-xl border border-white/10 bg-[#11141c] p-4">
   <summary className="cursor-pointer font-semibold">Oranları ve nitelikli izlenme eşiğini düzenle</summary>
   <fieldset disabled={busy} className="mt-4 space-y-4">
    <p className="text-sm text-plooy-muted">Değişiklik açık ayın dağıtımına uygulanır. Arşiv değişmez. İzlenmesi olmayan havuzun payı Plooy'da kalır. Temel türlerin payını sıfırlayabilirsiniz. Ayrı havuz olarak eklenen Dizi, Stand-up ve Dikey dizi başlangıçta %0; istediğiniz payları buradan belirleyin.</p>
    <div className="flex flex-wrap gap-4">
     <label>Nitelikli izlenme eşiği (%)<input type="number" min="1" max="100" value={rules.threshold} onChange={e=>setRules({...rules,threshold:Number(e.target.value)})} className={field+' block w-28'}/></label>
     <label>Paylaştırma yöntemi<select className={field+' block'} value={rules.basis} onChange={e=>setRules({...rules,basis:e.target.value as AccountingRules['basis']})}><option value="views">Nitelikli izlenme sayısı</option><option value="minutes">Nitelikli izlenen dakika</option></select></label>
    </div>
    <div className="grid gap-3 md:grid-cols-3">{rules.pools.map((p,index)=><div key={p.id} className="rounded border border-white/10 p-3">
     <label className="block">{p.label}<input aria-label={p.label+' payı'} type="number" min="0" max="100" step="0.01" value={p.rate} className={field+' ml-2 w-24'} onChange={e=>setRules({...rules,pools:rules.pools.map((v,j)=>j===index?{...v,rate:Number(e.target.value)}:v)})}/>%</label>
     {p.categoryId&&<div className="mt-2 flex gap-2"><button type="button" className={button} disabled={index===0} onClick={()=>{const list=[...rules.pools];[list[index-1],list[index]]=[list[index],list[index-1]];setRules({...rules,pools:list})}}>Önceliği artır</button><button type="button" className={button} onClick={()=>setRules({...rules,pools:rules.pools.filter(v=>v.id!==p.id)})}>Kaldır</button></div>}
    </div>)}</div>
    <div className="flex flex-wrap gap-2"><select aria-label="Özel muhasebe kategorisi" className={field} value={category} onChange={e=>setCategory(e.target.value)}><option value="">Kategori seç</option>{categories.filter(c=>!rules.pools.some(p=>p.categoryId===c.id)).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><button type="button" className={button} disabled={!category} onClick={()=>{const c=categories.find(c=>c.id===category)!;setRules({...rules,pools:[{id:'custom_'+crypto.randomUUID(),categoryId:c.id,label:c.title,rate:0},...rules.pools]});setCategory('')}}>Kategori havuzu ekle</button></div>
    <p className="text-xs text-plooy-muted">Özel kategoriler içerik türünden önce uygulanır; bir film birden fazla özel kategorideyse üstteki kazanır. Genç Sinema kendi havuzunda, Plooy içerikleri ayrı kalır. Böylece aynı film iki kez pay almaz. Kategori üyeliği izlenme anında kaydedilir.</p>
    <p className={total>100?'text-red-300':'text-plooy-gold'}>Ayrılan: {pct(total)} · Plooy temel payı: {pct(100-total)}</p>
    <button type="button" className={button} disabled={total>100} onClick={()=>void save()}>Oranları kaydet</button>
   </fieldset>
  </details>}
  <div className="flex flex-wrap gap-3">
   <select aria-label="Muhasebe ayı" className={field} disabled={busy} value={month} onChange={e=>setMonth(e.target.value)}>{months.map(m=><option key={m.month} value={m.month}>{m.month} · {m.closed_at?'Arşiv':'Açık ay'}</option>)}</select>
   <select aria-label="Yapımcı grubu" className={field} value={group} onChange={e=>setGroup(e.target.value)}>{Object.entries(groups).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
   <input aria-label="Film veya yapımcı ara" className={field} placeholder="Film veya yapımcı ara..." value={query} onChange={e=>setQuery(e.target.value)}/>
   <button className={button} disabled={!report||loading} onClick={csv}>Excel / CSV indir</button><button className={button} disabled={!report||loading} onClick={print}>Yazdır / PDF</button>
  </div>
  {loading&&<p>Rapor yükleniyor…</p>}
  {report&&<>
   <p className="text-sm text-plooy-muted">Yeni 48 saat sayacı {new Date(report.startedAt).toLocaleDateString('tr-TR')} tarihinde başlar. Önceki kayıtlar aşağıdaki eski raporlardadır. {report.closedAt?'Bu ayın oranları ve izlenmeleri kilitlidir.':'Açık ayın verileri değişebilir.'}</p>
   <div className="flex flex-wrap gap-3">{report.rules.pools.map(p=><span key={p.id} className="rounded bg-white/5 px-3 py-2">{p.label}: {pct(p.rate)}</span>)}<span className="rounded bg-plooy-gold/10 px-3 py-2">Plooy (boş havuzlar dahil): {pct(report.platformShare)}</span></div>
   <p className="text-sm">Dağıtım: {report.rules.basis==='views'?'nitelikli izlenme sayısı':'nitelikli dakika'} · Eşik: %{report.rules.threshold}{report.thresholds.length>0?' · Bu ay uygulanan eşikler: '+report.thresholds.map(n=>'%'+n).join(', '):''}</p>
   <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr>{['Film','Grup','Yapımcı','İzlenme ↓','Nitelikli','Nitelikli dk','Havuz içi pay','Kar payı'].map(t=><th key={t} className="p-3">{t}</th>)}</tr></thead><tbody>{rows.map((i,n)=><tr key={i.contentId+n} className="border-t border-white/10"><td className="p-3">{i.title}</td><td className="p-3">{groups[i.program]}</td><td className="p-3">{i.creatorName}</td><td className="p-3">{i.views}</td><td className="p-3">{i.qualifiedViews}</td><td className="p-3">{(i.qualifiedSeconds/60).toFixed(1)}</td><td className="p-3">{pct(i.poolShare)}</td><td className="p-3 text-plooy-gold">{pct(i.profitShare)}</td></tr>)}</tbody></table>{!rows.length&&<p className="p-4 text-plooy-muted">Bu filtrede izlenme kaydı yok.</p>}</div>
   <h2 className="text-xl font-bold">Yapımcı ödemeleri</h2><p className="text-sm text-plooy-muted">Yüzdeler dağıtılabilir net kar üzerinden uygulanır. Banka transferini yaptıktan sonra ödendi işaretleyin; bu düğme para transferi yapmaz.</p>
   <div className="space-y-2">{report.creators.map(c=><div key={c.id} className="flex flex-wrap items-center gap-4 rounded border border-white/10 p-3"><span>{c.name}</span><strong>{pct(c.share)}</strong>{c.paidAt?<span className="text-emerald-300">Ödendi · {new Date(c.paidAt).toLocaleDateString('tr-TR')} · {c.reference}</span>:<button className={button} disabled={busy||!report.closedAt||c.share<=0} onClick={()=>void paid(c.id)}>Ödendi işaretle</button>}</div>)}</div>
  </>}
  <button className={button} onClick={()=>setLegacy(!legacy)}>{legacy?'Eski raporları kapat':'Önceki sistemin izlenme raporları'}</button>
  {legacy&&<LegacyWatchAccountingPage/>}
 </div>
}

