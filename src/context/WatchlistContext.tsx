import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from '../api/client'
import type { ContentItem } from '../types/content'
import { useAuth } from './AuthContext'

interface WatchlistContextValue {
  watchlistIds: string[]
  watchlistItems: ContentItem[]
  isLoading: boolean
  isInWatchlist: (contentId: string) => boolean
  toggleWatchlist: (contentId: string) => Promise<void>
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null)

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { activeProfile } = useAuth()
  const [watchlistItems, setWatchlistItems] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadWatchlist = useCallback(async () => {
    if (!activeProfile) {
      setWatchlistItems([])
      return
    }

    setIsLoading(true)
    try {
      const { items } = await fetchWatchlist()
      setWatchlistItems(items)
    } catch {
      setWatchlistItems([])
    } finally {
      setIsLoading(false)
    }
  }, [activeProfile])

  useEffect(() => {
    void loadWatchlist()
  }, [loadWatchlist])

  const watchlistIds = useMemo(() => watchlistItems.map((item) => item.id), [watchlistItems])

  const isInWatchlist = useCallback(
    (contentId: string) => watchlistIds.includes(contentId),
    [watchlistIds],
  )

  const toggleWatchlist = useCallback(
    async (contentId: string) => {
      if (!activeProfile) return

      if (watchlistIds.includes(contentId)) {
        await removeFromWatchlist(contentId)
      } else {
        await addToWatchlist(contentId)
      }
      await loadWatchlist()
    },
    [activeProfile, watchlistIds, loadWatchlist],
  )

  const value = useMemo(
    () => ({
      watchlistIds,
      watchlistItems,
      isLoading,
      isInWatchlist,
      toggleWatchlist,
    }),
    [watchlistIds, watchlistItems, isLoading, isInWatchlist, toggleWatchlist],
  )

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist must be used within WatchlistProvider')
  }
  return context
}
