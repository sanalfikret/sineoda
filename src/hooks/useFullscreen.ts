import { useCallback, useEffect, useRef, useState } from 'react'

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function requestElementFullscreen(element: HTMLElement) {
  const el = element as FullscreenElement
  if (element.requestFullscreen) {
    return element.requestFullscreen()
  }
  if (el.webkitRequestFullscreen) {
    return Promise.resolve(el.webkitRequestFullscreen())
  }
  return Promise.reject(new Error('Fullscreen desteklenmiyor.'))
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    return document.exitFullscreen()
  }
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void }
  if (doc.webkitExitFullscreen) {
    return Promise.resolve(doc.webkitExitFullscreen())
  }
  return Promise.resolve()
}

export function getActiveFullscreenElement() {
  const doc = document as Document & { webkitFullscreenElement?: Element | null }
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const sync = () => {
      const el = ref.current
      setIsFullscreen(Boolean(el && getActiveFullscreenElement() === el))
    }

    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  const enter = useCallback(async () => {
    const el = ref.current
    if (!el || getActiveFullscreenElement() === el) return
    await requestElementFullscreen(el)
  }, [])

  const exit = useCallback(async () => {
    if (!getActiveFullscreenElement()) return
    await exitFullscreen()
  }, [])

  const toggle = useCallback(async () => {
    const el = ref.current
    if (!el) return
    if (getActiveFullscreenElement() === el) {
      await exit()
      return
    }
    await enter()
  }, [enter, exit])

  useEffect(() => {
    return () => {
      const el = ref.current
      if (el && getActiveFullscreenElement() === el) {
        void exitFullscreen()
      }
    }
  }, [])

  return { ref, isFullscreen, enter, exit, toggle }
}

export function isFullscreenSupported() {
  return Boolean(
    document.fullscreenEnabled ||
      (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled,
  )
}
