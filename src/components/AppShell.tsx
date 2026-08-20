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
import { isContentAllowedForKids } from '../utils/contentRating'
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
  const { isAdmin, activeProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [playingTarget, setPlayingTarget] = useState<PlayTarget | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [kidsBlockMessage, setKidsBlockMessage] = useState<string | null>(null)

  const openDetail = useCallback(
    (item: ContentItem) => {
      saveBrowseScroll(location.pathname, location.search)
      const from = `${location.pathname}${location.search}`
      sessionStorage.setItem('content-detail-from', from)
      navigate(`/icerik/${item.id}`, { state: { from } })
    },
    [navigate, location.pathname, location.search],
  )

  const openPlayer = useCallback(
    async (item: ContentItem, episode?: Episode) => {
      if (activeProfile?.isKids && !isContentAllowedForKids(item.rating)) {
        setKidsBlockMessage('Bu içerik çocuk profili için uygun değil.')
        return
      }

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
    [activeProfile?.isKids, isAdmin, openDetail],
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
        {kidsBlockMessage && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kids-block-title"
          >
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11141c] p-6 shadow-2xl">
              <p id="kids-block-title" className="text-lg font-semibold text-white">
                Çocuk profili
              </p>
              <p className="mt-2 text-sm text-sineoda-muted">{kidsBlockMessage}</p>
              <button
                type="button"
                onClick={() => setKidsBlockMessage(null)}
                className="mt-5 w-full rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg"
              >
                Tamam
              </button>
            </div>
          </div>
        )}
        <SearchModal onSelect={openDetail} kidsSafe={Boolean(activeProfile?.isKids)} />
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
