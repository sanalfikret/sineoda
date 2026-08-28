import { useEffect } from 'react'
import { isTvBackKey, isTvDevice, isTvRemoteKey } from '../utils/tvDevice'

interface TvRemoteOptions {
  enabled: boolean
  onBack?: () => void
  onPlayPause?: () => void
  onSeekBack?: () => void
  onSeekForward?: () => void
}

/** Kumanda tuşları — Smart TV tarayıcıları için oynatıcı kontrolü. */
export function useTvRemoteKeys({
  enabled,
  onBack,
  onPlayPause,
  onSeekBack,
  onSeekForward,
}: TvRemoteOptions) {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTvDevice() && !isTvRemoteKey(event)) return

      if (isTvBackKey(event)) {
        event.preventDefault()
        onBack?.()
        return
      }

      if (event.key === 'MediaPlayPause' || event.key === 'MediaPlay' || event.key === 'MediaPause') {
        event.preventDefault()
        onPlayPause?.()
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'MediaRewind') {
        event.preventDefault()
        onSeekBack?.()
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'MediaFastForward') {
        event.preventDefault()
        onSeekForward?.()
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onPlayPause?.()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [enabled, onBack, onPlayPause, onSeekBack, onSeekForward])
}
