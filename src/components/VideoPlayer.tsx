import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchEpisodes, getProfileId, getToken, resolveMediaUrl, saveWatchProgress } from '../api/client'
import type { Episode, PlayTarget } from '../types/content'
import { isSeriesContent } from '../constants/contentTypes'
import { getYoutubeEmbedUrl, isYoutubeUrl } from '../utils/media'
import { getActiveFullscreenElement, isFullscreenSupported, useFullscreen } from '../hooks/useFullscreen'
import { ContentActionButtons } from './ContentActionButtons'
import { AgeRatingOverlay } from './AgeRatingOverlay'
import { PlaybackGuardOverlay } from './PlaybackGuardOverlay'
import { PlayerFullscreenButton } from './PlayerFullscreenButton'
import { usePlaybackGuard } from '../hooks/usePlaybackGuard'

interface VideoPlayerProps {
  target: PlayTarget | null
  onClose: () => void
  onPlayEpisode?: (episode: Episode) => void
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

export function VideoPlayer({ target, onClose, onPlayEpisode }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)
  const lastSavedRef = useRef(0)
  const countdownRef = useRef<number | null>(null)
  const [playing, setPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [captionsOn, setCaptionsOn] = useState(true)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [nextEpisode, setNextEpisode] = useState<Episode | null>(null)
  const [countdown, setCountdown] = useState(8)
  const hideTimerRef = useRef<number | null>(null)
  const { ref: playerRef, isFullscreen, toggle: toggleFullscreen } = useFullscreen<HTMLDivElement>()
  const fullscreenSupported = isFullscreenSupported()

  const sortedEpisodes = useMemo(
    () => [...episodes].sort((a, b) => a.season - b.season || a.episode - b.episode),
    [episodes],
  )

  const mediaUrl = target ? resolveMediaUrl(target.videoUrl) : ''
  const youtubeEmbedUrl = mediaUrl && isYoutubeUrl(mediaUrl) ? getYoutubeEmbedUrl(mediaUrl, { autoplay: true, controls: true }) : null
  const subtitles = target?.subtitles ?? []
  const hasCaptions = subtitles.length > 0 && !youtubeEmbedUrl
  const isVertical = target?.item.videoFormat === 'vertical'
  const canTrack = Boolean(getToken() && getProfileId() && target)

  const clearNextCountdown = useCallback(() => {
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const dismissNextEpisode = useCallback(() => {
    clearNextCountdown()
    setNextEpisode(null)
  }, [clearNextCountdown])

  const playNextEpisode = useCallback(() => {
    if (!nextEpisode || !onPlayEpisode) return
    clearNextCountdown()
    setNextEpisode(null)
    onPlayEpisode(nextEpisode)
  }, [nextEpisode, onPlayEpisode, clearNextCountdown])

  useEffect(() => {
    if (!target || !isSeriesContent(target.item.type)) {
      setEpisodes([])
      return
    }

    fetchEpisodes(target.item.id)
      .then((data) => setEpisodes(data.episodes))
      .catch(() => setEpisodes([]))
  }, [target])

  useEffect(() => {
    dismissNextEpisode()
  }, [target, dismissNextEpisode])

  const persistProgress = (position: number, videoDuration: number) => {
    if (!canTrack || !target || videoDuration <= 0) return
    void saveWatchProgress({
      contentId: target.item.id,
      episodeId: target.episodeId,
      position,
      duration: videoDuration,
    }).catch(() => undefined)
    lastSavedRef.current = position
  }

  const handleClose = useCallback(() => {
    const video = videoRef.current
    if (video && canTrack) {
      persistProgress(video.currentTime, video.duration || duration)
    }
    onClose()
  }, [canTrack, duration, onClose, target])

  const pauseVideo = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    setPlaying(false)
    persistProgress(video.currentTime, video.duration || duration)
  }, [duration, target, canTrack])

  const resumeVideo = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    void video.play().catch(() => setPlaying(false))
    setPlaying(true)
  }, [])

  const { guardState, guardMessage, confirmStillWatching } = usePlaybackGuard({
    enabled: Boolean(target && canTrack),
    contentId: target?.item.id,
    episodeId: target?.episodeId,
    onClose: handleClose,
    pauseVideo,
    resumeVideo,
  })

  useEffect(() => {
    if (!target || !mediaUrl || youtubeEmbedUrl) return

    const video = videoRef.current
    if (!video) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const startAt = target.startPosition && target.startPosition > 5 ? target.startPosition : 0
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
  }, [target, mediaUrl, youtubeEmbedUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasCaptions) return

    for (const track of video.textTracks) {
      track.mode = captionsOn ? 'showing' : 'hidden'
    }
  }, [captionsOn, hasCaptions, target, mediaUrl])

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
  }, [target, duration, canTrack])

  useEffect(() => {
    if (!target) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !getActiveFullscreenElement()) handleClose()
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        void toggleFullscreen()
      }
      if (event.key === ' ') {
        event.preventDefault()
        const video = videoRef.current
        if (!video) return
        if (video.paused) {
          void video.play()
          setPlaying(true)
        } else {
          video.pause()
          setPlaying(false)
        }
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
  }, [target, toggleFullscreen, handleClose])

  useEffect(() => {
    if (!nextEpisode) return

    setCountdown(8)
    clearNextCountdown()

    countdownRef.current = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1))
    }, 1000)

    return () => clearNextCountdown()
  }, [nextEpisode, clearNextCountdown])

  useEffect(() => {
    if (!nextEpisode || countdown > 0) return
    playNextEpisode()
  }, [countdown, nextEpisode, playNextEpisode])

  if (!target) return null

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

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const ratingPlaybackKey = `${target.item.id}:${target.episodeId ?? 'main'}`

  return (
    <div
      ref={playerRef}
      className={`safe-top safe-bottom fixed inset-0 z-[60] flex items-center justify-center bg-black ${
        isVertical ? 'px-4' : ''
      }`}
      onMouseMove={scheduleHideControls}
      onTouchStart={scheduleHideControls}
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
          isVertical
            ? 'h-full max-h-[100dvh] w-auto max-w-full object-contain'
            : youtubeEmbedUrl
              ? 'hidden'
              : 'h-full w-full object-contain'
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
        onEnded={() => {
          setPlaying(false)
          persistProgress(0, duration)

          if (!target || !onPlayEpisode || sortedEpisodes.length === 0) return

          const currentIndex = sortedEpisodes.findIndex((ep) => ep.id === target.episodeId)
          const next = currentIndex >= 0 ? sortedEpisodes[currentIndex + 1] : sortedEpisodes[0]
          if (!next?.videoUrl?.trim()) return

          setNextEpisode(next)
          setCountdown(8)
        }}
      >
        {subtitles.map((track, index) => (
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
          title={target.title}
          className={
            isVertical
              ? 'aspect-[9/16] h-full max-h-[100dvh] w-auto max-w-full'
              : 'h-full w-full'
          }
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}

      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="absolute inset-x-0 top-0 z-10 px-4 py-4 sm:px-6">
        <div
          className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={handleClose}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sineoda-gold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Geri
          </button>
          <h2 className="truncate text-center text-sm font-semibold text-white sm:text-base">{target.title}</h2>
          <div className="flex w-[118px] justify-end">
            {fullscreenSupported && (
              <PlayerFullscreenButton
                isFullscreen={isFullscreen}
                onClick={() => void toggleFullscreen()}
              />
            )}
          </div>
        </div>

        <ContentActionButtons
          contentId={target.item.id}
          title={target.title}
          showWatchlist={false}
          className="pointer-events-auto absolute right-4 top-4 sm:right-6"
        />
      </div>

      {!youtubeEmbedUrl && !playing && (
        <button
          type="button"
          aria-label="Oynat"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sineoda-gold/90 text-sineoda-bg shadow-xl transition hover:scale-105"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {nextEpisode && (
        <div className="pointer-events-auto absolute bottom-24 right-4 z-20 w-[min(100%,20rem)] rounded-2xl border border-white/15 bg-black/85 p-4 shadow-2xl backdrop-blur-md sm:bottom-28 sm:right-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-gold">Sonraki Bölüm</p>
          <p className="mt-2 text-sm font-semibold text-white">
            S{nextEpisode.season} B{nextEpisode.episode} · {nextEpisode.title}
          </p>
          <p className="mt-1 text-xs text-sineoda-muted">{countdown} saniye içinde başlıyor</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={playNextEpisode}
              className="flex-1 rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              Devam Et
            </button>
            <button
              type="button"
              onClick={dismissNextEpisode}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {!youtubeEmbedUrl && (
      <div
        className={`absolute inset-x-0 bottom-0 space-y-3 px-4 pb-6 transition-opacity duration-300 sm:px-6 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
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
            <button type="button" aria-label={playing ? 'Duraklat' : 'Oynat'} onClick={togglePlay} className="rounded-full p-2 text-white transition hover:bg-white/10">
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button type="button" aria-label={muted ? 'Sesi aç' : 'Sessize al'} onClick={() => setMuted((value) => !value)} className="rounded-full p-2 text-white transition hover:bg-white/10">
              {muted ? <MutedIcon /> : <VolumeIcon />}
            </button>
            {hasCaptions && (
              <button
                type="button"
                aria-label={captionsOn ? 'Altyazıyı kapat' : 'Altyazıyı aç'}
                onClick={() => setCaptionsOn((value) => !value)}
                className={`rounded-full px-2.5 py-2 text-xs font-semibold transition hover:bg-white/10 ${
                  captionsOn ? 'text-sineoda-gold' : 'text-white'
                }`}
              >
                CC
              </button>
            )}
            {fullscreenSupported && (
              <PlayerFullscreenButton
                isFullscreen={isFullscreen}
                onClick={() => void toggleFullscreen()}
              />
            )}
            <span className="text-xs text-white/80 sm:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <span className="hidden text-xs text-white/60 sm:inline">
            {target.item.rating} · {target.item.year}
            {isVertical ? ' · Dikey' : ''}
          </span>
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
      <path d="M15 9a4 4 0 010 6M17 7a7 7 0 010 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
