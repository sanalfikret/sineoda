import { useEffect, useRef, useState } from 'react'
import {
  PLAYBACK_JINGLE_MS,
  PLAYBACK_JINGLE_SKIP_RESUME_AFTER_SEC,
  PLAYBACK_JINGLE_SRC,
} from '../constants/playback'
import { PlooyLogo } from './PlooyLogo'

interface PlaybackJingleOverlayProps {
  active: boolean
  onComplete: () => void
}

async function loadAndPlayJingle(durationMs: number): Promise<boolean> {
  const audio = new Audio(PLAYBACK_JINGLE_SRC)
  audio.preload = 'auto'

  const canPlay = await new Promise<boolean>((resolve) => {
    const fail = () => resolve(false)
    audio.addEventListener('canplaythrough', () => resolve(true), { once: true })
    audio.addEventListener('error', fail, { once: true })
    window.setTimeout(fail, 2500)
    audio.load()
  })

  if (!canPlay) return false

  try {
    await audio.play()
  } catch {
    return false
  }

  await new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      audio.pause()
      resolve()
    }
    audio.addEventListener('ended', finish, { once: true })
    window.setTimeout(finish, durationMs)
  })

  return true
}

export function PlaybackJingleOverlay({ active, onComplete }: PlaybackJingleOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!active) {
      setVisible(false)
      setFading(false)
      return
    }

    let cancelled = false

    void (async () => {
      setVisible(true)
      setFading(false)

      const played = await loadAndPlayJingle(PLAYBACK_JINGLE_MS)
      if (cancelled) return

      if (!played) {
        setVisible(false)
        onCompleteRef.current()
        return
      }

      setFading(true)
      window.setTimeout(() => {
        if (cancelled) return
        setVisible(false)
        onCompleteRef.current()
      }, 450)
    })()

    return () => {
      cancelled = true
    }
  }, [active])

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
      <div className="flex flex-col items-center gap-4 animate-[plooy-jingle-pop_0.9s_ease-out]">
        <PlooyLogo tone="on-dark" className="h-10 sm:h-12" />
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-plooy-gold/90">Plooy</p>
      </div>
    </div>
  )
}

export function shouldPlayPlaybackJingle(startPosition?: number) {
  return (startPosition ?? 0) <= PLAYBACK_JINGLE_SKIP_RESUME_AFTER_SEC
}
