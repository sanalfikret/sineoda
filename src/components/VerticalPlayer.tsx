import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { fetchEpisodes, getProfileId, getToken, resolveMediaUrl, saveWatchProgress } from '../api/client'
import { isSeriesContent } from '../constants/contentTypes'
import type { Episode, PlayTarget } from '../types/content'
import { getYoutubeEmbedUrl, isYoutubeUrl } from '../utils/media'
import { resolvePlayVideoUrl } from '../utils/playVideo'
import { getActiveFullscreenElement, isFullscreenSupported, useFullscreen } from '../hooks/useFullscreen'
import { ContentActionButtons } from './ContentActionButtons'
import { AgeRatingOverlay } from './AgeRatingOverlay'
import { PlaybackGuardOverlay } from './PlaybackGuardOverlay'
import { PlayerFullscreenButton } from './PlayerFullscreenButton'
import { usePlaybackGuard } from '../hooks/usePlaybackGuard'

interface VerticalPlayerProps {
  target: PlayTarget | null
  onClose: () => void
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function isHlsUrl(url: string) {
  return url.includes('.m3u8')
}

async function loadHls() {
  const mod = await import('hls.js')
  return mod.default
}

export function VerticalPlayer({ target, onClose }: VerticalPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)
  const lastSavedRef = useRef(0)
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)

  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [episodeIndex, setEpisodeIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showEpisodeList, setShowEpisodeList] = useState(false)
  const [swipeHint, setSwipeHint] = useState(true)
  const hideTimerRef = useRef<number | null>(null)
  const { ref: playerRef, isFullscreen, toggle: toggleFullscreen } = useFullscreen<HTMLDivElement>()
  const fullscreenSupported = isFullscreenSupported()

  const canTrack = Boolean(getToken() && getProfileId() && target)

  const sortedEpisodes = useMemo(
    () => [...episodes].sort((a, b) => a.season - b.season || a.episode - b.episode),
    [episodes],
  )

  const hasEpisodes = sortedEpisodes.length > 0
  const currentEpisode = hasEpisodes ? sortedEpisodes[episodeIndex] : null

  const activeVideoUrl = target
    ? resolvePlayVideoUrl(target.item, currentEpisode)
    : ''
  const activeSubtitles = currentEpisode?.subtitles?.length
    ? currentEpisode.subtitles
    : target?.subtitles ?? []
  const mediaUrl = activeVideoUrl ? resolveMediaUrl(activeVideoUrl) : ''
  const youtubeEmbedUrl =
    mediaUrl && isYoutubeUrl(mediaUrl)
      ? getYoutubeEmbedUrl(mediaUrl, { autoplay: true, controls: true })
      : null
  const displayTitle = currentEpisode
    ? `${target?.item.title} · B${currentEpisode.episode} ${currentEpisode.title}`
    : target?.title ?? ''

  const persistProgress = useCallback(
    (position: number, videoDuration: number) => {
      if (!canTrack || !target || videoDuration <= 0) return
      void saveWatchProgress({
        contentId: target.item.id,
        episodeId: currentEpisode?.id,
        position,
        duration: videoDuration,
      }).catch(() => undefined)
      lastSavedRef.current = position
    },
    [canTrack, target, currentEpisode?.id],
  )

  useEffect(() => {
    if (!target) return

    setEpisodes([])
    setEpisodeIndex(0)
    setShowEpisodeList(false)
    setSwipeHint(true)

    if (!isSeriesContent(target.item.type)) return

    fetchEpisodes(target.item.id)
      .then((data) => {
        const sorted = [...data.episodes].sort(
          (a, b) => a.season - b.season || a.episode - b.episode,
        )
        setEpisodes(sorted)
        if (target.episodeId) {
          const index = sorted.findIndex((ep) => ep.id === target.episodeId)
          if (index >= 0) setEpisodeIndex(index)
        }
      })
      .catch(() => setEpisodes([]))
  }, [target])

  useEffect(() => {
    if (!target || !mediaUrl || youtubeEmbedUrl) return

    const video = videoRef.current
    if (!video) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const startAt =
      !hasEpisodes && target.startPosition && target.startPosition > 5
        ? target.startPosition
        : 0

    setCurrentTime(startAt)
    setDuration(0)
    setPlaying(true)
    lastSavedRef.current = startAt

    const beginPlayback = () => {
      if (startAt > 0) video.currentTime = startAt
      void video.play().catch(() => setPlaying(false))
    }

    if (isHlsUrl(mediaUrl)) {
      void (async () => {
        const Hls = await loadHls()
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true })
          hlsRef.current = hls
          hls.loadSource(mediaUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, beginPlayback)
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = mediaUrl
          video.addEventListener('loadedmetadata', beginPlayback, { once: true })
        }
      })()
    } else {
      video.src = mediaUrl
      video.addEventListener('loadedmetadata', beginPlayback, { once: true })
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [target, mediaUrl, youtubeEmbedUrl, episodeIndex, hasEpisodes])

  useEffect(() => {
    if (!target) return

    const interval = window.setInterval(() => {
      const video = videoRef.current
      if (!video || video.paused) return
      if (video.currentTime - lastSavedRef.current >= 10) {
        persistProgress(video.currentTime, video.duration || duration)
      }
    }, 10000)

    return () => window.clearInterval(interval)
  }, [target, duration, persistProgress])

  const handleClose = useCallback(() => {
    const video = videoRef.current
    if (video && canTrack) {
      persistProgress(video.currentTime, video.duration || duration)
    }
    onClose()
  }, [canTrack, duration, onClose, persistProgress])

  const pauseVideo = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    setPlaying(false)
    persistProgress(video.currentTime, video.duration || duration)
  }, [duration, persistProgress, canTrack])

  const resumeVideo = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    void video.play().catch(() => setPlaying(false))
    setPlaying(true)
  }, [])

  const { guardState, guardMessage, confirmStillWatching } = usePlaybackGuard({
    enabled: Boolean(target && canTrack),
    contentId: target?.item.id,
    episodeId: currentEpisode?.id ?? target?.episodeId,
    onClose: handleClose,
    pauseVideo,
    resumeVideo,
  })

  useEffect(() => {
    if (!target) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !getActiveFullscreenElement()) handleClose()
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        void toggleFullscreen()
      }
      if (event.key === 'ArrowUp') goToEpisode(episodeIndex + 1)
      if (event.key === 'ArrowDown') goToEpisode(episodeIndex - 1)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    const hintTimer = window.setTimeout(() => setSwipeHint(false), 5000)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(hintTimer)
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
  }, [target, episodeIndex, toggleFullscreen, handleClose])

  if (!target) return null

  const goToEpisode = (index: number) => {
    if (!hasEpisodes) return
    if (index < 0 || index >= sortedEpisodes.length) return
    const video = videoRef.current
    if (video && canTrack) {
      persistProgress(video.currentTime, video.duration || duration)
    }
    setEpisodeIndex(index)
    setShowEpisodeList(false)
    setSwipeHint(false)
  }

  const goNext = () => goToEpisode(episodeIndex + 1)
  const goPrev = () => goToEpisode(episodeIndex - 1)

  const handleEnded = () => {
    setPlaying(false)
    persistProgress(0, duration)
    if (hasEpisodes && episodeIndex < sortedEpisodes.length - 1) {
      goNext()
    }
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
      persistProgress(video.currentTime, video.duration || duration)
    }
  }

  const handleSeek = (value: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = value
    setCurrentTime(value)
  }

  const scheduleHideControls = () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    setShowControls(true)
    hideTimerRef.current = window.setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartY.current = event.touches[0].clientY
    touchStartX.current = event.touches[0].clientX
    scheduleHideControls()
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!hasEpisodes) return
    const deltaY = event.changedTouches[0].clientY - touchStartY.current
    const deltaX = Math.abs(event.changedTouches[0].clientX - touchStartX.current)
    if (deltaX > 40) return
    if (deltaY < -60) goNext()
    else if (deltaY > 60) goPrev()
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const ratingPlaybackKey = `${target.item.id}:${currentEpisode?.id ?? 'main'}`

  return (
    <div
      ref={playerRef}
      className="safe-top safe-bottom fixed inset-0 z-[60] flex items-center justify-center bg-black"
      onMouseMove={scheduleHideControls}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {guardState !== 'playing' && (
        <PlaybackGuardOverlay
          mode={guardState}
          message={guardMessage}
          onContinue={confirmStillWatching}
          onClose={handleClose}
        />
      )}

      <AgeRatingOverlay rating={target.item.rating} playbackKey={ratingPlaybackKey} />

      <video
        ref={videoRef}
        className={
          youtubeEmbedUrl
            ? 'hidden'
            : 'h-full max-h-[100dvh] w-auto max-w-full object-contain'
        }
        playsInline
        muted={muted}
        onClick={togglePlay}
        onDoubleClick={(event) => {
          event.preventDefault()
          void toggleFullscreen()
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
      >
        {activeSubtitles.map((track, index) => (
          <track
            key={`${track.lang}-${index}`}
            kind="subtitles"
            src={resolveMediaUrl(track.url)}
            srcLang={track.lang}
            label={track.label}
            default={track.lang === 'tr' || index === 0}
          />
        ))}
      </video>

      {youtubeEmbedUrl && (
        <iframe
          src={youtubeEmbedUrl}
          title={displayTitle}
          className="aspect-[9/16] h-full max-h-[100dvh] w-auto max-w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}

      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="absolute inset-x-0 top-0 z-10 px-4 py-4 sm:px-6">
        <div
          className={`flex items-center justify-between gap-3 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={handleClose}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Geri
          </button>
          <h2 className="truncate text-center text-sm font-semibold text-white">{displayTitle}</h2>
          {hasEpisodes ? (
            <button
              type="button"
              onClick={() => setShowEpisodeList((open) => !open)}
              className="pointer-events-auto rounded-full bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm"
            >
              Bölümler
            </button>
          ) : (
            <div className="w-[72px]" />
          )}
        </div>

        <ContentActionButtons
          contentId={target.item.id}
          title={displayTitle}
          showWatchlist={false}
          className="pointer-events-auto absolute right-4 top-16 flex flex-col gap-3 sm:right-6"
        />
      </div>

      {swipeHint && hasEpisodes && sortedEpisodes.length > 1 && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 animate-pulse text-center text-xs text-white/70">
          <p>↑ Sonraki bölüm</p>
          <p className="mt-1">↓ Önceki bölüm</p>
        </div>
      )}

      {!youtubeEmbedUrl && !playing && (
        <button
          type="button"
          aria-label="Oynat"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sineoda-gold/90 text-sineoda-bg shadow-xl"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {!youtubeEmbedUrl && (
        <div
          className={`absolute inset-x-0 bottom-0 space-y-3 px-4 pb-6 transition-opacity duration-300 sm:px-6 ${
            showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {hasEpisodes && (
            <div className="hide-scrollbar pointer-events-auto flex gap-2 overflow-x-auto pb-1">
              {sortedEpisodes.map((episode, index) => (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => goToEpisode(index)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    index === episodeIndex
                      ? 'bg-sineoda-gold text-sineoda-bg'
                      : 'bg-white/15 text-white/80 hover:bg-white/25'
                  }`}
                >
                  {episode.episode}
                </button>
              ))}
            </div>
          )}

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(event) => handleSeek(Number(event.target.value))}
            className="pointer-events-auto h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-sineoda-gold"
            style={{
              background: `linear-gradient(to right, #e8b84a ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
            }}
          />

          <div className="pointer-events-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-full p-2 text-white transition hover:bg-white/10"
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                className="rounded-full p-2 text-white transition hover:bg-white/10"
              >
                {muted ? <MutedIcon /> : <VolumeIcon />}
              </button>
              {fullscreenSupported && (
                <PlayerFullscreenButton
                  isFullscreen={isFullscreen}
                  onClick={() => void toggleFullscreen()}
                />
              )}
              <span className="text-xs text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            {hasEpisodes && (
              <span className="text-xs text-white/60">
                Bölüm {episodeIndex + 1}/{sortedEpisodes.length}
              </span>
            )}
          </div>
        </div>
      )}

      {showEpisodeList && hasEpisodes && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/70 backdrop-blur-sm">
          <div className="max-h-[70dvh] w-full overflow-y-auto rounded-t-3xl bg-sineoda-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Bölümler</h3>
              <button
                type="button"
                onClick={() => setShowEpisodeList(false)}
                className="rounded-full bg-white/10 px-3 py-1 text-sm text-white"
              >
                Kapat
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {sortedEpisodes.map((episode, index) => (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => goToEpisode(index)}
                  className={`rounded-xl border p-3 text-center transition ${
                    index === episodeIndex
                      ? 'border-sineoda-gold bg-sineoda-gold/15 text-sineoda-gold'
                      : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <p className="text-lg font-bold">{episode.episode}</p>
                  <p className="mt-1 truncate text-[10px] text-white/60">{episode.duration}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function MutedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
