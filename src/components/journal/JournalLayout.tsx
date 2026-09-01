import { Outlet } from 'react-router-dom'
import { AppShell } from '../AppShell'
import { GuestSiteShell } from '../GuestSiteShell'
import { PageFooter } from '../PageFooter'
import { useAuth } from '../../context/AuthContext'
import { SearchProvider } from '../../context/SearchContext'
import { WatchlistProvider } from '../../context/WatchlistContext'

function MemberProviders({ children }: { children: React.ReactNode }) {
  return (
    <WatchlistProvider>
      <SearchProvider>{children}</SearchProvider>
    </WatchlistProvider>
  )
}

export function JournalLayout() {
  const { user, activeProfile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (user && activeProfile) {
    return (
      <MemberProviders>
        <AppShell>
          <div className="pt-20">
            <Outlet />
          </div>
        </AppShell>
      </MemberProviders>
    )
  }

  return (
    <GuestSiteShell
      footer={<PageFooter />}
    >
      <div className="min-h-dvh bg-plooy-bg pt-20 text-white">
        <Outlet />
      </div>
    </GuestSiteShell>
  )
}
