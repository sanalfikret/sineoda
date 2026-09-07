import { useRef, useState } from 'react'
import { api } from '../../api/client'
export function BilingualField({label,tr,en,onTr,onEn,multiline=false}:{label:string;tr:string;en:string;onTr:(v:string)=>void;onEn:(v:string)=>void;multiline?:boolean}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const latest=useRef({tr,en,onEn});latest.current={tr,en,onEn}
 const lock=useRef(false)
 async function translate(){if(lock.current||!tr.trim()||en.trim())return;lock.current=true;setBusy(true);setError('');const source=tr
 try{const data=await api<{text:string}>('/api/admin/translations/suggest',{method:'POST',body:JSON.stringify({text:source})});if(latest.current.tr===source&&!latest.current.en.trim())latest.current.onEn(data.text)}catch(e){setError(e instanceof Error?e.message:'Çeviri yapılamadı.')}finally{lock.current=false;setBusy(false)}}
 const style='w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white'
 return <div className="space-y-2"><div className="grid gap-4 sm:grid-cols-2"><label>{label} (TR){multiline?<textarea className={style} rows={6} value={tr} onChange={e=>onTr(e.target.value)} onBlur={()=>void translate()}/>:<input className={style} value={tr} onChange={e=>onTr(e.target.value)} onBlur={()=>void translate()}/>}</label><label>{label} (EN){multiline?<textarea className={style} rows={6} value={en} onChange={e=>onEn(e.target.value)}/>:<input className={style} value={en} onChange={e=>onEn(e.target.value)}/>}</label></div><button type="button" disabled={busy||!!en.trim()} onClick={()=>void translate()} className="text-sm text-plooy-gold">{busy?'Çevriliyor…':'Boş İngilizce alanı çevir'}</button>{error&&<p role="alert" className="text-red-400">{error}</p>}</div>
}
