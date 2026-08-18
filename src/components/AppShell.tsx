import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchCanPlay, fetchWatchProgress } from '../api/client'
import type { ContentItem, Episode, PlayTarget } from '../types/content'
import { DetailModal } from './DetailModal'
import { Header } from './Header'
import { InstallPrompt } from './InstallPrompt'
import { PaywallModal } from './PaywallModal'
import { SearchModal } from './SearchModal'
import { VideoPlayer } from './VideoPlayer'
import { useAuth } from '../context/AuthContext'

interface ContentUIContextValue {
  openDetail: (item: ContentItem) => void
  openPlayer: (item: ContentItem, episode?: Episode) => void
}

const ContentUIContext = createContext<ContentUIContextValue | null>(null)

export function AppShell({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const [detailItem, setDetailItem] = useState<ContentItem | null>(null)
  const [playingTarget, setPlayingTarget] = useState<PlayTarget | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  const openDetail = useCallback((item: ContentItem) => {
    setDetailItem(item)
  }, [])

  const openPlayer = useCallback(
    async (item: ContentItem, episode?: Episode) => {
      if (!isAdmin) {
        try {
          const { allowed } = await fetchCanPlay()
          if (!allowed) {
            setPaywallOpen(true)
            return
          }
        } catch {
          setPaywallOpen(true)
          return
        }
      }

      const videoUrl = episode?.videoUrl ?? item.videoUrl
      const title = episode ? `${item.title} · S${episode.season} B${episode.episode} ${episode.title}` : item.title

      let startPosition = 0
      try {
        const { progress } = await fetchWatchProgress(item.id, episode?.id)
        if (
          progress &&
          progress.position > 10 &&
          progress.duration > 0 &&
          progress.position < progress.duration - 30
        ) {
          startPosition = progress.position
        }
      } catch {
        // Giriş yapılmamışsa veya profil yoksa sıfırdan başla
      }

      setDetailItem(null)
      setPlayingTarget({
        item,
        videoUrl,
        title,
        episodeId: episode?.id,
        startPosition,
      })
    },
    [isAdmin],
  )

  const value = useMemo(() => ({ openDetail, openPlayer }), [openDetail, openPlayer])

  return (
    <ContentUIContext.Provider value={value}>
      <div className="min-h-dvh bg-sineoda-bg">
        <Header />
        {children}
        <DetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onPlay={openPlayer}
        />
        <VideoPlayer target={playingTarget} onClose={() => setPlayingTarget(null)} />
        <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
        <SearchModal onSelect={openDetail} />
        <InstallPrompt />
      </div>
    </ContentUIContext.Provider>
  )
}

export function useContentUI() {
  const context = useContext(ContentUIContext)
  if (!context) {
    throw new Error('useContentUI must be used within AppShell')
  }
  return context
}
