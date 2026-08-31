import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchAdForContent, fetchCanPlay, fetchEpisodes, fetchWatchProgress, recordAdView } from '../api/client'
import type { ContentItem, Episode, PlayTarget } from '../types/content'
import type { AdPlayback } from '../types/ads'
import { AdPlayer } from './AdPlayer'
import { Header } from './Header'
import { PaywallModal } from './PaywallModal'
import { SearchModal } from './SearchModal'
import { PageFooter } from './PageFooter'
import { VideoPlayer } from './VideoPlayer'
import { VerticalPlayer } from './VerticalPlayer'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../i18n/LocaleContext'
import { isSeriesContent } from '../constants/contentTypes'
import { isContentAllowedForKids } from '../utils/contentRating'
import { isVerticalContent } from '../utils/vertical'
import { saveBrowseScroll } from '../utils/browseState'
import { resolvePlayVideoUrl } from '../utils/playVideo'

interface ContentUIContextValue {
  openDetail: (item: ContentItem) => void
  openPlayer: (item: ContentItem, episode?: Episode) => void
}

const ContentUIContext = createContext<ContentUIContextValue | null>(null)

export function useOptionalContentUI() {
  return useContext(ContentUIContext)
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('content')
  const { t: tc } = useTranslation()
  const { localizePath } = useLocale()
  const { isAdmin, activeProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [playingTarget, setPlayingTarget] = useState<PlayTarget | null>(null)
  const [pendingPlayTarget, setPendingPlayTarget] = useState<PlayTarget | null>(null)
  const [adSession, setAdSession] = useState<(AdPlayback & { contentId: string }) | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [kidsBlockMessage, setKidsBlockMessage] = useState<string | null>(null)

  const openDetail = useCallback(
    (item: ContentItem) => {
      saveBrowseScroll(location.pathname, location.search)
      const from = `${location.pathname}${location.search}`
      sessionStorage.setItem('content-detail-from', from)
      navigate(localizePath(`/icerik/${item.id}`), { state: { from } })
    },
    [navigate, location.pathname, location.search, localizePath],
  )

  const openPlayer = useCallback(
    async (item: ContentItem, episode?: Episode) => {
      if (activeProfile?.isKids && !isContentAllowedForKids(item.rating)) {
        setKidsBlockMessage(t('kidsBlock.message'))
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
          resolvedEpisode =
            sorted.find((entry) => entry.videoUrl?.trim()) ??
            (sorted[0]?.videoUrl?.trim() ? sorted[0] : undefined)
        } catch {
          resolvedEpisode = undefined
        }
      }

      const videoUrl = resolvePlayVideoUrl(item, resolvedEpisode)
      if (!videoUrl) {
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

      const playTarget: PlayTarget = {
        item,
        videoUrl,
        title,
        episodeId: resolvedEpisode?.id,
        startPosition,
        subtitles: resolvedEpisode?.subtitles?.length ? resolvedEpisode.subtitles : item.subtitles,
      }

      if (!isAdmin) {
        try {
          const ad = await fetchAdForContent(item.id, Boolean(activeProfile?.isKids))
          if (ad.show) {
            setPendingPlayTarget(playTarget)
            setAdSession({ ...ad, contentId: item.id })
            return
          }
        } catch {
          // Reklam servisi yoksa doğrudan oynat
        }
      }

      setPlayingTarget(playTarget)
    },
    [activeProfile?.isKids, isAdmin, openDetail, t],
  )

  const completeAdAndPlay = useCallback(async () => {
    const pending = pendingPlayTarget
    const session = adSession
    setAdSession(null)
    setPendingPlayTarget(null)
    if (session) {
      await recordAdView(session.campaignId, session.contentId).catch(() => undefined)
    }
    if (pending) setPlayingTarget(pending)
  }, [adSession, pendingPlayTarget])

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
      <div className="min-h-dvh bg-plooy-bg">
        <Header />
        {children}
        <PageFooter />
        {adSession && (
          <AdPlayer
            sponsorName={adSession.sponsorName}
            videoUrl={adSession.videoUrl}
            skipMode={adSession.skipMode}
            skipAfterSeconds={adSession.skipAfterSeconds}
            onComplete={() => void completeAdAndPlay()}
          />
        )}
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
                {t('kidsBlock.title')}
              </p>
              <p className="mt-2 text-sm text-plooy-muted">{kidsBlockMessage}</p>
              <button
                type="button"
                onClick={() => setKidsBlockMessage(null)}
                className="mt-5 w-full rounded-lg bg-plooy-gold px-4 py-2.5 text-sm font-semibold text-plooy-bg"
              >
                {tc('actions.ok')}
              </button>
            </div>
          </div>
        )}
        <SearchModal onSelect={openDetail} kidsSafe={Boolean(activeProfile?.isKids)} />
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
