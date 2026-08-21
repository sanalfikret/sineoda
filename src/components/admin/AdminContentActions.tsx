import { Link } from 'react-router-dom'

export const ADMIN_NEW_CONTENT_HREF = '/admin/icerikler/yeni'
export const ADMIN_NEW_VERTICAL_HREF = '/admin/icerikler/yeni?dikey=1'

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
        className="rounded-lg border border-sineoda-gold/50 bg-sineoda-gold/10 px-4 py-2 text-sm font-semibold text-sineoda-gold transition hover:bg-sineoda-gold/20"
      >
        + Dikey Dizi
      </Link>
      <Link
        to={ADMIN_NEW_CONTENT_HREF}
        className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
      >
        + Yeni İçerik
      </Link>
    </div>
  )
}
