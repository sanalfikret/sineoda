import type { ReactNode } from 'react'
import { SearchProvider } from '../context/SearchContext'
import { WatchlistProvider } from '../context/WatchlistContext'

export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return (
    <WatchlistProvider>
      <SearchProvider>{children}</SearchProvider>
    </WatchlistProvider>
  )
}
