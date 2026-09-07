import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
const labels: Record<string, string> = { new_creator: 'Yeni yapımcı', new_student: 'Yeni Genç Sinema', paid_accounts: 'Ödemesi tamamlanan hesaplar', pending: 'Yeni film', under_review: 'İnceleniyor', on_hold: 'Bekletiliyor', approved: 'Onaylandı', rejected: 'Reddedildi', published: 'Yayında' }
type Item = { id: string; title: string; program: string; status: string; paidAt?: string; viewers?: number; likes?: number; watchMinutes?: number }
export function AdminReviewQueues() {
  const [status, setStatus] = useState('pending'); const [offset, setOffset] = useState(0)
  const [data, setData] = useState<{ counts: Record<string, number>; items: Item[] }>({ counts: {}, items: [] })
  const requestVersion = useRef(0)
  const [loading, setLoading] = useState(true)
  const accountQueue = status.startsWith('new_') || status === 'paid_accounts'
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const version=++requestVersion.current; setLoading(true); setError('')
    try { const result=await api<{counts:Record<string,number>;items:Item[]}>('/api/admin/queues?status='+status+'&offset='+offset); if(version===requestVersion.current) setData(result) }
    catch(e) { if(version===requestVersion.current) setError(e instanceof Error ? e.message : 'Kuyruk yüklenemedi.') }
    finally { if(version===requestVersion.current) setLoading(false) }
  },[status,offset])
  useEffect(() => { void load(); const focus=()=>void load(); window.addEventListener('focus',focus); return ()=>{requestVersion.current++;window.removeEventListener('focus',focus)} },[load])
  async function review(item: Item, next: string) {
    setBusy(true); setError('')
    const account = accountQueue
    const path = account ? '/api/admin/creators/creators/' + item.id : '/api/admin/' + (item.program === 'student_cinema' ? 'student-cinema' : 'creators') + '/content/' + item.id + '/review'
    try { await api(path, { method: 'PATCH', body: JSON.stringify(account ? { status: next } : { reviewStatus: next }) }); await load() } catch(e) { setError(e instanceof Error ? e.message : 'Güncellenemedi.') } finally { setBusy(false) }
  }
  return <section className="mb-6 rounded-xl border border-white/10 p-4"><h2 className="mb-3 text-xl text-white">İşlem bekleyenler</h2><p className="mb-3 text-sm text-white/60">Hesap onayı ve film onayı ayrı işlemlerdir. Ödemesi tamamlanan hesaplar, yeni başvuru kuyruklarında da yer alır.</p><button type="button" disabled={loading || busy} onClick={() => void load()} className="mb-3 text-amber-300">Yenile</button><div className="flex flex-wrap gap-2">{Object.entries(labels).map(([key,label]) => <button type="button" key={key} disabled={busy} onClick={() => { if (key !== status || offset !== 0) setLoading(true); setStatus(key); setOffset(0) }} className={'rounded px-3 py-2 ' + (status === key ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/70')}>{label} ({data.counts[key] ?? '—'})</button>)}</div><p role="alert" className="text-red-300">{error}</p>
    {loading && <p className="py-3 text-white/60">Yükleniyor…</p>}{!loading && !error && data.items.map(item => <div key={item.id} className="my-3 flex flex-wrap items-center gap-3 border-b border-white/10 py-3"><strong className="grow text-white">{item.title}</strong><span className="text-white/70">{accountQueue ? (item.paidAt ? 'Ödendi' : 'Ödeme bekliyor') : (item.viewers ?? 0) + ' izleyici · ' + (item.likes ?? 0) + ' beğeni · ' + Math.round(item.watchMinutes ?? 0) + ' dk'}</span>{!accountQueue && <select aria-label={item.title + ' durumu'} disabled={busy} className="rounded bg-zinc-800 p-2 text-white" value="" onChange={e => { if(e.target.value) void review(item,e.target.value) }}><option value="">Durumu değiştir</option>{(status.startsWith('new_') ? ['approved','rejected'] : ['pending','under_review','on_hold','approved','rejected']).map(key => <option key={key} value={key}>{labels[key]}</option>)}</select>}<a className="text-amber-300" href={accountQueue ? (item.program === 'student_cinema' ? '/admin/genc-sinema' : '/admin/yapimcilar') : (item.program === 'student_cinema' ? '/admin/genc-sinema/' : '/admin/icerikler/') + encodeURIComponent(item.id)}>İncele</a></div>)}
    {!loading && !error && !data.items.length && <p className="py-3 text-white/60">Bu kuyruk boş.</p>}<button type="button" disabled={loading || busy || !offset} onClick={() => setOffset(Math.max(0,offset-50))} className="mr-4 text-white disabled:opacity-30">Önceki</button><button type="button" disabled={loading || busy || offset+50 >= (data.counts[status] ?? 0)} onClick={() => setOffset(offset+50)} className="text-white disabled:opacity-30">Sonraki</button>
  </section>
}
