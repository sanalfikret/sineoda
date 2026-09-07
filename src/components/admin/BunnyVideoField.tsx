import { useEffect, useState } from 'react'
export function BunnyVideoField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [host, setHost] = useState(''); const [id, setId] = useState('')
  useEffect(() => { try { const u = new URL(value); if (u.hostname.endsWith('.b-cdn.net')) { setHost(u.hostname); setId(u.pathname.split('/')[1] ?? '') } } catch { /* No Bunny video yet. */ } }, [value])
  function update(h: string, v: string) { setHost(h); setId(v); onChange(h && v ? 'https://' + h.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/' + v.trim() + '/playlist.m3u8' : '') }
  return <section className="space-y-3 rounded-lg border border-emerald-500/30 p-4">
    <h3 className="font-semibold text-emerald-200">Bunny videosunu bu filme bağla</h3>
    <p className="text-sm text-plooy-muted">Bunny’ye yüklediğiniz videonun bilgilerini girip filmi kaydedin. Film sahibi, izlenmeler ve beğeniler aynı kayıtta korunur.</p>
    <label className="block text-sm">Bunny sunucu adresi (CDN hostname)<input className="block w-full rounded bg-black/30 p-2" value={host} onChange={e => update(e.target.value.trim(), id)} placeholder="vz-…b-cdn.net" /></label>
    <label className="block text-sm">Bunny video ID<input className="block w-full rounded bg-black/30 p-2" value={id} onChange={e => update(host, e.target.value.trim())} placeholder="Bunny video ID" /></label>
    <p className="text-xs text-plooy-muted">Bunny sunucu adresi kütüphanenin API bölümündedir. Video ID, yüklediğiniz videonun bilgilerindedir. Önce kaydedin, ardından yayına alın.</p>
  </section>
}
