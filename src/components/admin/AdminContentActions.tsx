import { Link } from 'react-router-dom'

export const ADMIN_NEW_CONTENT_HREF = '/admin/icerikler/yeni'
export const ADMIN_NEW_VERTICAL_HREF = '/admin/icerikler/yeni?dikey=1'
export const ADMIN_NEW_STANDUP_HREF = '/admin/icerikler/yeni?standup=1'

/** Admin üst çubuğu — içerik ekleme kısayolları (tek kaynak). */
export function AdminContentActions() {
  return (
    <div className="ml-auto flex flex-wrap gap-2">
      <Link
        to="/admin/genc-sinema"
        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
      >
        Genç Sinema
      </Link>
      <Link
        to={ADMIN_NEW_VERTICAL_HREF}
        className="rounded-lg border border-plooy-gold/50 bg-plooy-gold/10 px-4 py-2 text-sm font-semibold text-plooy-gold transition hover:bg-plooy-gold/20"
      >
        + Dikey Dizi
      </Link>
      <Link
        to={ADMIN_NEW_STANDUP_HREF}
        className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20"
      >
        + Stand-up
      </Link>
      <Link
        to={ADMIN_NEW_CONTENT_HREF}
        className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg transition hover:brightness-110"
      >
        + Yeni İçerik
      </Link>
    </div>
  )
}
