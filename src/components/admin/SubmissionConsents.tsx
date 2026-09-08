import {useEffect,useState} from 'react'
import {api} from '../../api/client'
type Entry={id:string;user_name:string;user_email:string;accepted_at:string;ip_address:string;consent_text:string}
export function SubmissionConsents(){
 const [open,setOpen]=useState(false),[offset,setOffset]=useState(0),[items,setItems]=useState<Entry[]>([]),[error,setError]=useState('')
 useEffect(()=>{if(!open)return;let active=true;api<{items:Entry[]}>('/api/admin/legal/submission-consents?offset='+offset).then(d=>{if(active){setItems(d.items);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[open,offset])
 return <details className="border border-white/20 rounded-xl p-4" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Film gönderim onay kayıtları</summary>{error&&<p>{error}</p>}{items.map(v=><details key={v.id} className="my-3 border-b border-white/10 p-2"><summary>{v.user_name} · {v.user_email} · {v.ip_address} · {new Date(v.accepted_at).toLocaleString('tr-TR')}</summary><pre className="whitespace-pre-wrap text-xs p-3">{v.consent_text}</pre></details>)}<button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}>Önceki 50</button><button className="ml-5" disabled={items.length<50} onClick={()=>setOffset(offset+50)}>Sonraki 50</button></details>
}
