import { useCallback, useEffect, useState } from 'react'
import { shouldPlayPlaybackJingle } from '../components/PlaybackJingleOverlay'

export function usePlaybackJingleGate(playbackKey: string, startPosition?: number, skip = false) {
  const wantsJingle = !skip && shouldPlayPlaybackJingle(startPosition)
  const [jingleDone, setJingleDone] = useState(!wantsJingle)

  useEffect(() => {
    setJingleDone(!wantsJingle)
  }, [playbackKey, wantsJingle])

  const completeJingle = useCallback(() => {
    setJingleDone(true)
  }, [])

  return {
    jingleBlocking: wantsJingle && !jingleDone,
    showJingle: wantsJingle && !jingleDone,
    jingleDone,
    completeJingle,
  }
}
