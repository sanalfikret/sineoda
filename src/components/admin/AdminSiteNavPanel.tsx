import { NAV_CATEGORY_SYNC } from '../../constants/siteNavLinks'
import { SITE_NAV_ITEMS, type SiteNavId } from '../../constants/siteNav'

interface AdminSiteNavPanelProps {
  hiddenNavIds: SiteNavId[]
  saving?: boolean
  onToggle: (navId: SiteNavId, hidden: boolean) => void
}

export function AdminSiteNavPanel({ hiddenNavIds, saving = false, onToggle }: AdminSiteNavPanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#11141c] p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Menü görünürlüğü</h2>
        <p className="mt-1 text-sm text-sineoda-muted">
          Kapatılan menüler üst navigasyonda, ilgili sayfalarda, bağlı kategori satırlarında ve o türdeki
          içeriklerde görünmez. Menü ile kategori çift yönlü senkronlanır.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SITE_NAV_ITEMS.filter((item) => item.id !== 'home').map((item) => {
          const hidden = hiddenNavIds.includes(item.id)
          const linkedCategories = NAV_CATEGORY_SYNC[item.id]
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition ${
                hidden ? 'border-white/10 bg-white/[0.02]' : 'border-emerald-500/25 bg-emerald-500/5'
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-white">{item.label}</p>
                <p className="truncate text-xs text-sineoda-muted">{item.path}</p>
                {linkedCategories.length > 0 ? (
                  <p className="mt-1 text-[11px] text-emerald-300/70">
                    Kategoriler: {linkedCategories.join(', ')}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-sineoda-muted">Bağımsız menü</p>
                )}
              </div>
              <button
                type="button"
                disabled={saving}
                aria-pressed={!hidden}
                onClick={() => onToggle(item.id, !hidden)}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                  hidden
                    ? 'border-white/10 text-sineoda-muted hover:bg-white/5'
                    : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                }`}
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                    hidden ? 'border-white/20 bg-transparent' : 'border-emerald-400 bg-emerald-500/30'
                  }`}
                  aria-hidden="true"
                >
                  {!hidden && '✓'}
                </span>
                {hidden ? 'Gizli' : 'Açık'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
