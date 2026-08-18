import { useEffect, useRef, useState } from 'react'
import { getProfileId, getToken, resolveMediaUrl, saveWatchProgress } from '../api/client'
import type { PlayTarget } from '../types/content'
import { getYoutubeEmbedUrl, isYoutubeUrl } from '../utils/media'
import { ContentActionButtons } from './ContentActionButtons'

interface VideoPlayerProps {
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

export function VideoPlayer({ target, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)
  const lastSavedRef = useRef(0)
  const [playing, setPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [captionsOn, setCaptionsOn] = useState(true)
  const hideTimerRef = useRef<number | null>(null)

  const mediaUrl = target ? resolveMediaUrl(target.videoUrl) : ''
  const youtubeEmbedUrl = mediaUrl && isYoutubeUrl(mediaUrl) ? getYoutubeEmbedUrl(mediaUrl, { autoplay: true, controls: true }) : null
  const subtitles = target?.subtitles ?? []
  const hasCaptions = subtitles.length > 0 && !youtubeEmbedUrl
  const isVertical = target?.item.videoFormat === 'vertical'
  const canTrack = Boolean(getToken() && getProfileId() && target)

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
      if (event.key === 'Escape') handleClose()
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
  }, [target])

  if (!target) return null

  const handleClose = () => {
    const video = videoRef.current
    if (video && canTrack) {
      persistProgress(video.currentTime, video.duration || duration)
    }
    onClose()
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

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={`safe-top safe-bottom fixed inset-0 z-[60] flex items-center justify-center bg-black ${
        isVertical ? 'px-4' : ''
      }`}
      onMouseMove={scheduleHideControls}
      onTouchStart={scheduleHideControls}
    >
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
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          persistProgress(0, duration)
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

      <div
        className={`absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 transition-opacity duration-300 sm:px-6 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
        <h2 className="truncate px-4 text-sm font-semibold text-white sm:text-base">{target.title}</h2>
        <div className="w-16 shrink-0 sm:w-20" />
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

      {!youtubeEmbedUrl && (
      <div
        className={`absolute inset-x-0 bottom-0 space-y-3 px-4 pb-6 transition-opacity duration-300 sm:px-6 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="pointer-events-auto flex justify-end sm:hidden">
          <ContentActionButtons
            contentId={target.item.id}
            title={target.title}
            showWatchlist={false}
          />
        </div>
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
            <span className="text-xs text-white/80 sm:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <ContentActionButtons
            contentId={target.item.id}
            title={target.title}
            showWatchlist={false}
            className="hidden sm:block"
          />
        </div>
      </div>
      )}

      {youtubeEmbedUrl && (
        <div
          className={`absolute inset-x-0 bottom-0 flex justify-end px-4 pb-6 transition-opacity duration-300 sm:px-6 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ContentActionButtons
            contentId={target.item.id}
            title={target.title}
            showWatchlist={false}
            className="pointer-events-auto"
          />
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
