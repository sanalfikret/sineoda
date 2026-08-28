import { useCallback, useEffect, useRef, useState } from 'react'
import { getToken, heartbeatPlaybackSession, startPlaybackSession, stopPlaybackSession } from '../api/client'
import { PLAYBACK_HEARTBEAT_MS, PLAYBACK_IDLE_CLOSE_MS, PLAYBACK_IDLE_MS } from '../constants/playbackGuard'
import { getSessionId } from '../utils/sessionId'

type GuardState = 'playing' | 'idle_prompt' | 'other_device'

interface UsePlaybackGuardOptions {
  enabled: boolean
  contentId?: string
  episodeId?: string
  onClose: () => void
  pauseVideo: () => void
  resumeVideo: () => void
}

export function usePlaybackGuard({
  enabled,
  contentId,
  episodeId,
  onClose,
  pauseVideo,
  resumeVideo,
}: UsePlaybackGuardOptions) {
  const [guardState, setGuardState] = useState<GuardState>('playing')
  const guardStateRef = useRef<GuardState>('playing')
  const lastActivityRef = useRef(Date.now())
  const idleCloseTimerRef = useRef<number | null>(null)

  const setGuard = useCallback((next: GuardState) => {
    guardStateRef.current = next
    setGuardState(next)
  }, [])

  const clearIdleCloseTimer = useCallback(() => {
    if (idleCloseTimerRef.current) {
      window.clearTimeout(idleCloseTimerRef.current)
      idleCloseTimerRef.current = null
    }
  }, [])

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (guardStateRef.current === 'idle_prompt') {
      clearIdleCloseTimer()
      setGuard('playing')
      resumeVideo()
    }
  }, [clearIdleCloseTimer, resumeVideo, setGuard])

  const confirmStillWatching = useCallback(() => {
    bumpActivity()
  }, [bumpActivity])

  useEffect(() => {
    if (!enabled || !contentId || !getToken()) {
      setGuard('playing')
      return
    }

    const sessionId = getSessionId()
    lastActivityRef.current = Date.now()
    setGuard('playing')

    void startPlaybackSession({
      sessionId,
      contentId,
      episodeId,
    }).catch(() => undefined)

    const heartbeat = window.setInterval(() => {
      void heartbeatPlaybackSession(sessionId)
        .then((result) => {
          if (!result.active && guardStateRef.current !== 'other_device') {
            pauseVideo()
            setGuard('other_device')
            clearIdleCloseTimer()
          }
        })
        .catch(() => undefined)
    }, PLAYBACK_HEARTBEAT_MS)

    const idleCheck = window.setInterval(() => {
      if (guardStateRef.current === 'other_device') return
      const idleFor = Date.now() - lastActivityRef.current
      if (idleFor >= PLAYBACK_IDLE_MS && guardStateRef.current === 'playing') {
        pauseVideo()
        setGuard('idle_prompt')
        clearIdleCloseTimer()
        idleCloseTimerRef.current = window.setTimeout(() => {
          onClose()
        }, PLAYBACK_IDLE_CLOSE_MS)
      }
    }, 10_000)

    const onActivity = () => {
      lastActivityRef.current = Date.now()
      if (guardStateRef.current === 'idle_prompt') {
        clearIdleCloseTimer()
        setGuard('playing')
        resumeVideo()
      }
    }

    window.addEventListener('mousemove', onActivity, { passive: true })
    window.addEventListener('keydown', onActivity)
    window.addEventListener('touchstart', onActivity, { passive: true })
    window.addEventListener('click', onActivity)

    return () => {
      window.clearInterval(heartbeat)
      window.clearInterval(idleCheck)
      clearIdleCloseTimer()
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('touchstart', onActivity)
      window.removeEventListener('click', onActivity)
      void stopPlaybackSession(sessionId).catch(() => undefined)
    }
  }, [enabled, contentId, episodeId, onClose, pauseVideo, resumeVideo, clearIdleCloseTimer, setGuard])

  return {
    guardState,
    bumpActivity,
    confirmStillWatching,
  }
}
