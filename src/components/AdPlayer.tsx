import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../api/client'
import type { AdSkipMode } from '../types/ads'

interface AdPlayerProps {
  sponsorName: string
  videoUrl: string
  skipMode: AdSkipMode
  skipAfterSeconds: number
  onComplete: () => void
}

export function AdPlayer({ sponsorName, videoUrl, skipMode, skipAfterSeconds, onComplete }: AdPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const completedRef = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const mediaUrl = resolveMediaUrl(videoUrl)

  const finish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete()
  }, [onComplete])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = false
    void video.play().catch(() => {
      video.muted = true
      void video.play().catch(() => undefined)
    })
  }, [mediaUrl])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const canSkip = skipMode === 'skippable' && elapsed >= skipAfterSeconds
  const skipCountdown =
    skipMode === 'skippable' ? Math.max(0, skipAfterSeconds - elapsed) : null

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={mediaUrl}
        className="h-full w-full object-contain"
        playsInline
        onEnded={finish}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Sponsorlu içerik</p>
        <p className="mt-1 text-lg font-semibold text-white">{sponsorName}</p>
      </div>

      <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-8">
        {skipMode === 'skippable' ? (
          <button
            type="button"
            disabled={!canSkip}
            onClick={finish}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              canSkip
                ? 'bg-white text-black hover:bg-white/90'
                : 'cursor-not-allowed bg-white/20 text-white/60'
            }`}
          >
            {canSkip ? 'Reklamı Geç' : `Geç (${skipCountdown}s)`}
          </button>
        ) : (
          <span className="rounded-full bg-black/60 px-4 py-2 text-xs text-white/70 backdrop-blur">
            Reklam bitince içerik başlayacak
          </span>
        )}
      </div>
    </div>
  )
}
