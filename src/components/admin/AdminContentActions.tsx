import { Link, useLocation } from 'react-router-dom'

export const ADMIN_NEW_CONTENT_HREF = '/admin/icerikler/yeni'
export const ADMIN_NEW_VERTICAL_HREF = '/admin/icerikler/yeni?tur=dikey'
export const ADMIN_NEW_STANDUP_HREF = '/admin/icerikler/yeni?tur=stand-up'

export function adminNewContentHref(preset: string) {
  return `/admin/icerikler/yeni?tur=${encodeURIComponent(preset)}`
}

/** Üst çubuk: her içerik türü için tek tıkla yeni kayıt formu (form o türle hazır açılır). */
const QUICK_TYPES: Array<{ id: string; label: string; className: string }> = [
  { id: 'film', label: '+ Film', className: 'border-white/15 bg-white/5 text-white hover:bg-white/10' },
  { id: 'dizi', label: '+ Dizi', className: 'border-white/15 bg-white/5 text-white hover:bg-white/10' },
  { id: 'belgesel', label: '+ Belgesel', className: 'border-white/15 bg-white/5 text-white hover:bg-white/10' },
  { id: 'kisa-film', label: '+ Kısa Film', className: 'border-white/15 bg-white/5 text-white hover:bg-white/10' },
  { id: 'stand-up', label: '+ Stand-up', className: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20' },
  { id: 'dikey', label: '+ Dikey Dizi', className: 'border-plooy-gold/50 bg-plooy-gold/10 text-plooy-gold hover:bg-plooy-gold/20' },
]

export function AdminContentActions() {
  const location = useLocation()
  const activePreset = location.pathname === '/admin/icerikler/yeni' ? new URLSearchParams(location.search).get('tur') : null

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Link
        to="/admin/genc-sinema"
        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 xl:px-3.5 xl:text-sm"
      >
        Genç Sinema
      </Link>
      {QUICK_TYPES.map((entry) => (
        <Link
          key={entry.id}
          to={adminNewContentHref(entry.id)}
          aria-current={activePreset === entry.id ? 'page' : undefined}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition xl:px-3.5 xl:text-sm ${entry.className} ${
            activePreset === entry.id ? 'ring-2 ring-plooy-gold/60' : ''
          }`}
        >
          {entry.label}
        </Link>
      ))}
    </div>
  )
}
