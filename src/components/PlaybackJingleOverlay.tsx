import { useEffect, useState } from 'react'
import {
  PLAYBACK_JINGLE_MS,
  PLAYBACK_JINGLE_SKIP_RESUME_AFTER_SEC,
} from '../constants/playback'
import { playPlaybackJingle } from '../utils/playbackJingleAudio'
import { PlooyLogo } from './PlooyLogo'

interface PlaybackJingleOverlayProps {
  active: boolean
  onComplete: () => void
}

export function PlaybackJingleOverlay({ active, onComplete }: PlaybackJingleOverlayProps) {
  const [visible, setVisible] = useState(active)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      setFading(false)
      return
    }

    setVisible(true)
    setFading(false)
    let cancelled = false

    void (async () => {
      await playPlaybackJingle(PLAYBACK_JINGLE_MS)
      if (cancelled) return
      setFading(true)
      window.setTimeout(() => {
        if (cancelled) return
        setVisible(false)
        onComplete()
      }, 450)
    })()

    return () => {
      cancelled = true
    }
  }, [active, onComplete])

  if (!visible) return null

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[38] flex items-center justify-center bg-black ${
        fading ? 'opacity-0 transition-opacity duration-500' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Plooy açılış"
    >
      <div
        className={`flex flex-col items-center gap-4 ${fading ? '' : 'animate-[plooy-jingle-pop_0.9s_ease-out]'}`}
      >
        <PlooyLogo tone="on-dark" className="h-10 sm:h-12" />
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-plooy-gold/90">Plooy</p>
      </div>
    </div>
  )
}

export function shouldPlayPlaybackJingle(startPosition?: number) {
  return (startPosition ?? 0) <= PLAYBACK_JINGLE_SKIP_RESUME_AFTER_SEC
}
