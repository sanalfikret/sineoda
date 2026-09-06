import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useContent } from '../../context/ContentContext'
type Values = Record<'tr' | 'en', { title: string; description: string }>
export function DynamicTranslationEditor({ kind, id }: { kind: 'content' | 'categories'; id: string }) {
  const [values, setValues] = useState<Values | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const { refresh } = useContent()
  useEffect(() => { let active = true; setValues(null); api<{ translations: Values }>(`/api/admin/translations/${kind}/${encodeURIComponent(id)}`).then(r => { if (active) setValues(r.translations) }).catch(() => { if (active) setMessage('Dil alanları yüklenemedi.') }); return () => { active = false } }, [kind, id])
  async function save() {
    setSaving(true); setMessage('')
    try { await api(`/api/admin/translations/${kind}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ translations: values }) }); await refresh(); setMessage('TR ve EN kaydedildi.') }
    catch(e) { setMessage(e instanceof Error ? e.message : 'Kaydedilemedi.') } finally { setSaving(false) }
  }
  return <details className="my-4 rounded-lg border border-white/15 p-4 text-white"><summary>Türkçe / English içerik</summary>
    {values && <div className="mt-3 grid gap-4 md:grid-cols-2">{(['tr','en'] as const).map(locale => <div key={locale}><h3>{locale === 'tr' ? 'Türkçe' : 'English'}</h3>{(['title','description'] as const).map(field => <label className="my-2 block" key={field}>{field === 'title' ? 'Başlık / Title' : 'Açıklama / Description'}<textarea className="block w-full rounded bg-black/40 p-2" value={values[locale][field]} onChange={e => setValues({ ...values, [locale]: { ...values[locale], [field]: e.target.value } })} /></label>)}</div>)}</div>}
    <button type="button" disabled={!values || saving} onClick={() => void save()} className="mt-2 rounded bg-amber-700 px-4 py-2 disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'TR ve EN kaydet'}</button><p role="status">{message}</p>
  </details>
}
