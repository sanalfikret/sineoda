import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchCanPlay, fetchEpisodes, fetchWatchProgress } from '../api/client'
import type { ContentItem, Episode, PlayTarget } from '../types/content'
import { Header } from './Header'
import { InstallPrompt } from './InstallPrompt'
import { PaywallModal } from './PaywallModal'
import { SearchModal } from './SearchModal'
import { SiteFooter } from './SiteFooter'
import { VideoPlayer } from './VideoPlayer'
import { VerticalPlayer } from './VerticalPlayer'
import { useAuth } from '../context/AuthContext'
import { isSeriesContent } from '../constants/contentTypes'
import { isVerticalContent } from '../utils/vertical'
import { saveBrowseScroll } from '../utils/browseState'

interface ContentUIContextValue {
  openDetail: (item: ContentItem) => void
  openPlayer: (item: ContentItem, episode?: Episode) => void
}

const ContentUIContext = createContext<ContentUIContextValue | null>(null)

export function useOptionalContentUI() {
  return useContext(ContentUIContext)
}

export function AppShell({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [playingTarget, setPlayingTarget] = useState<PlayTarget | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  const openDetail = useCallback(
    (item: ContentItem) => {
      saveBrowseScroll(location.pathname, location.search)
      const from = `${location.pathname}${location.search}`
      navigate(`/icerik/${item.id}`, { state: { from } })
    },
    [navigate, location.pathname, location.search],
  )

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

      let resolvedEpisode = episode
      if (!resolvedEpisode && isSeriesContent(item.type)) {
        try {
          const { episodes } = await fetchEpisodes(item.id)
          const sorted = [...episodes].sort(
            (a, b) => a.season - b.season || a.episode - b.episode,
          )
          resolvedEpisode = sorted.find((entry) => entry.videoUrl?.trim()) ?? sorted[0]
        } catch {
          resolvedEpisode = undefined
        }
      }

      const videoUrl = resolvedEpisode?.videoUrl ?? item.videoUrl
      if (!videoUrl?.trim()) {
        openDetail(item)
        return
      }

      const title = resolvedEpisode
        ? `${item.title} · S${resolvedEpisode.season} B${resolvedEpisode.episode} ${resolvedEpisode.title}`
        : item.title

      let startPosition = 0
      try {
        const { progress } = await fetchWatchProgress(item.id, resolvedEpisode?.id)
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

      setPlayingTarget({
        item,
        videoUrl,
        title,
        episodeId: resolvedEpisode?.id,
        startPosition,
        subtitles: resolvedEpisode?.subtitles?.length ? resolvedEpisode.subtitles : item.subtitles,
      })
    },
    [isAdmin, openDetail],
  )

  const playNextEpisode = useCallback(
    (episode: Episode) => {
      if (!playingTarget) return
      void openPlayer(playingTarget.item, episode)
    },
    [playingTarget, openPlayer],
  )

  const value = useMemo(() => ({ openDetail, openPlayer }), [openDetail, openPlayer])

  return (
    <ContentUIContext.Provider value={value}>
      <div className="min-h-dvh bg-sineoda-bg">
        <Header />
        {children}
        <SiteFooter />
        <VideoPlayer
          target={playingTarget && !isVerticalContent(playingTarget.item) ? playingTarget : null}
          onClose={() => setPlayingTarget(null)}
          onPlayEpisode={(episode) => playNextEpisode(episode)}
        />
        <VerticalPlayer target={playingTarget && isVerticalContent(playingTarget.item) ? playingTarget : null} onClose={() => setPlayingTarget(null)} />
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
