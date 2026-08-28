import { useCallback, useEffect, useRef, useState } from 'react'
import { getToken, heartbeatPlaybackSession, startPlaybackSession, stopPlaybackSession } from '../api/client'
import type { PlaybackGuardMode } from '../components/PlaybackGuardOverlay'
import { PLAYBACK_HEARTBEAT_MS, PLAYBACK_IDLE_CLOSE_MS, PLAYBACK_IDLE_MS } from '../constants/playbackGuard'
import { isTvDevice } from '../utils/tvDevice'
import { getSessionId } from '../utils/sessionId'

interface UsePlaybackGuardOptions {
  enabled: boolean
  contentId?: string
  episodeId?: string
  isVideoPlaying?: () => boolean
  onClose: () => void
  pauseVideo: () => void
  resumeVideo: () => void
}

function mapBlockReason(reason?: string): PlaybackGuardMode {
  if (reason === 'daily_limit') return 'daily_limit'
  return 'other_device'
}

export function usePlaybackGuard({
  enabled,
  contentId,
  episodeId,
  isVideoPlaying,
  onClose,
  pauseVideo,
  resumeVideo,
}: UsePlaybackGuardOptions) {
  const [guardState, setGuardState] = useState<PlaybackGuardMode | 'playing'>('playing')
  const [guardMessage, setGuardMessage] = useState<string | undefined>()
  const guardStateRef = useRef<PlaybackGuardMode | 'playing'>('playing')
  const lastActivityRef = useRef(Date.now())
  const lastWatchTickRef = useRef(Date.now())
  const pendingSecondsRef = useRef(0)
  const idleCloseTimerRef = useRef<number | null>(null)
  const sessionIdRef = useRef('')

  const setGuard = useCallback((next: PlaybackGuardMode | 'playing', message?: string) => {
    guardStateRef.current = next
    setGuardState(next)
    setGuardMessage(message)
  }, [])

  const clearIdleCloseTimer = useCallback(() => {
    if (idleCloseTimerRef.current) {
      window.clearTimeout(idleCloseTimerRef.current)
      idleCloseTimerRef.current = null
    }
  }, [])

  const collectWatchSeconds = useCallback(() => {
    if (guardStateRef.current === 'other_device' || guardStateRef.current === 'daily_limit') {
      lastWatchTickRef.current = Date.now()
      return 0
    }
    const now = Date.now()
    const delta = Math.max(0, Math.round((now - lastWatchTickRef.current) / 1000))
    lastWatchTickRef.current = now
    if (delta > 0) pendingSecondsRef.current += delta
    return pendingSecondsRef.current
  }, [])

  const flushWatchSeconds = useCallback(async () => {
    const seconds = collectWatchSeconds()
    pendingSecondsRef.current = 0
    if (!sessionIdRef.current || seconds <= 0) return seconds
    await heartbeatPlaybackSession(sessionIdRef.current, seconds).catch(() => undefined)
    return seconds
  }, [collectWatchSeconds])

  const blockPlayback = useCallback(
    (reason: PlaybackGuardMode, message?: string) => {
      pauseVideo()
      setGuard(reason, message)
      clearIdleCloseTimer()
    },
    [clearIdleCloseTimer, pauseVideo, setGuard],
  )

  const confirmStillWatching = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (guardStateRef.current === 'idle_prompt') {
      clearIdleCloseTimer()
      setGuard('playing')
      resumeVideo()
    }
  }, [clearIdleCloseTimer, resumeVideo, setGuard])

  useEffect(() => {
    if (!enabled || !contentId || !getToken()) {
      setGuard('playing')
      return
    }

    const sessionId = getSessionId()
    sessionIdRef.current = sessionId
    lastActivityRef.current = Date.now()
    lastWatchTickRef.current = Date.now()
    pendingSecondsRef.current = 0
    setGuard('playing')

    void startPlaybackSession({ sessionId, contentId, episodeId }).then((result) => {
      if (result.allowed === false) {
        blockPlayback(mapBlockReason(result.reason), result.message)
      }
    })

    const heartbeat = window.setInterval(() => {
      const seconds = collectWatchSeconds()
      void heartbeatPlaybackSession(sessionId, seconds)
        .then((result) => {
          pendingSecondsRef.current = 0
          if (!result.active) {
            blockPlayback(mapBlockReason(result.reason), result.message)
          }
        })
        .catch(() => undefined)
    }, PLAYBACK_HEARTBEAT_MS)

    const idleCheck = window.setInterval(() => {
      if (guardStateRef.current === 'other_device' || guardStateRef.current === 'daily_limit') return

      // TV: video oynarken kumanda hareketi şart değil — gerçekten izleniyor say
      if (isTvDevice() && isVideoPlaying?.()) {
        lastActivityRef.current = Date.now()
        return
      }

      const idleFor = Date.now() - lastActivityRef.current
      if (idleFor >= PLAYBACK_IDLE_MS && guardStateRef.current === 'playing') {
        pauseVideo()
        setGuard('idle_prompt')
        clearIdleCloseTimer()
        idleCloseTimerRef.current = window.setTimeout(() => {
          void flushWatchSeconds()
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
      const seconds = collectWatchSeconds()
      void stopPlaybackSession(sessionId, seconds).catch(() => undefined)
      sessionIdRef.current = ''
    }
  }, [
    enabled,
    contentId,
    episodeId,
    onClose,
    pauseVideo,
    blockPlayback,
    clearIdleCloseTimer,
    setGuard,
    resumeVideo,
    collectWatchSeconds,
    flushWatchSeconds,
    isVideoPlaying,
  ])

  return {
    guardState,
    guardMessage,
    confirmStillWatching,
  }
}
