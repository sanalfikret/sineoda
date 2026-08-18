import { AppShell, useContentUI } from '../components/AppShell'
import { ContentCard } from '../components/ContentCard'
import { useWatchlist } from '../context/WatchlistContext'

function MyListContent() {
  const { watchlistItems } = useWatchlist()
  const { openDetail, openPlayer } = useContentUI()

  return (
    <main className="px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Listem</h1>
        <p className="mt-2 text-sm text-sineoda-muted">
          Daha sonra izlemek için kaydettiğin içerikler
        </p>

        {watchlistItems.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {watchlistItems.map((item) => (
              <div key={item.id} className="space-y-2">
                <ContentCard item={item} onSelect={openDetail} />
                <button
                  type="button"
                  onClick={() => openPlayer(item)}
                  className="w-full rounded-lg bg-sineoda-gold/15 py-2 text-xs font-semibold text-sineoda-gold transition hover:bg-sineoda-gold/25 sm:text-sm"
                >
                  Oynat
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-white/10 bg-sineoda-surface px-6 py-16 text-center">
            <p className="text-lg font-medium text-white">Listen henüz boş</p>
            <p className="mt-2 text-sm text-sineoda-muted">
              Bir içeriğin detay sayfasından &quot;Listeme Ekle&quot; butonuna basarak başla.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export function MyListPage() {
  return (
    <AppShell>
      <MyListContent />
    </AppShell>
  )
}
