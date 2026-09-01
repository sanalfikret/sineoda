import { useTranslation } from 'react-i18next'
import { AppShell, useContentUI } from '../components/AppShell'
import { ContentCard } from '../components/ContentCard'
import { useWatchlist } from '../context/WatchlistContext'
import { useAuth } from '../context/AuthContext'
import { isContentAllowedForKids } from '../utils/contentRating'

function MyListContent() {
  const { t } = useTranslation('myList')
  const { watchlistItems } = useWatchlist()
  const { activeProfile } = useAuth()
  const { openDetail, openPlayer } = useContentUI()

  const items = activeProfile?.isKids
    ? watchlistItems.filter((item) => isContentAllowedForKids(item.rating))
    : watchlistItems

  return (
    <main className="px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{t('title')}</h1>
        <p className="mt-2 text-sm text-plooy-muted">{t('subtitle')}</p>

        {items.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <div key={item.id} className="space-y-2">
                <ContentCard item={item} onSelect={openDetail} variant="grid" />
                <button
                  type="button"
                  onClick={() => openPlayer(item)}
                  className="w-full rounded-lg bg-plooy-gold/15 py-2 text-xs font-semibold text-plooy-gold transition hover:bg-plooy-gold/25 sm:text-sm"
                >
                  {t('play')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-white/10 bg-plooy-surface px-6 py-16 text-center">
            <p className="text-lg font-medium text-white">{t('emptyTitle')}</p>
            <p className="mt-2 text-sm text-plooy-muted">{t('emptyBody')}</p>
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
