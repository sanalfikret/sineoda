/** Smart TV / set-top tarayıcı tespiti (Samsung Tizen, LG webOS, Android TV, Apple TV, Chromecast). */
export function isTvDevice() {
  if (typeof window === 'undefined') return false

  const ua = navigator.userAgent.toLowerCase()
  const tvPattern =
    /smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast|web0s|webos|tizen|crkey|android tv|aftb|aftm|aftt|nexus player|shield|freebox|philips|sonyce|viera|bravia|firetv|cloudwalker|nettv|large screen/i

  if (tvPattern.test(ua)) return true

  // Chromecast / Cast receiver often reports CrKey
  if (/\bcast\b/i.test(ua)) return true

  const wide = window.innerWidth >= 1280
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const noHover = window.matchMedia('(hover: none)').matches
  const noTouch = !('ontouchstart' in window)

  // Büyük ekran + kumanda (ince pointer yok, hover yok)
  if (wide && noHover && (coarse || noTouch)) return true

  return false
}

export function getDeviceKind(): 'tv' | 'mobile' | 'desktop' {
  if (isTvDevice()) return 'tv'
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) return 'mobile'
  return 'desktop'
}

export function isTvRemoteKey(event: KeyboardEvent) {
  const key = event.key
  if (
    key === 'Enter' ||
    key === ' ' ||
    key === 'MediaPlayPause' ||
    key === 'MediaPlay' ||
    key === 'MediaPause' ||
    key === 'MediaStop' ||
    key === 'MediaFastForward' ||
    key === 'MediaRewind' ||
    key.startsWith('Arrow') ||
    key === 'GoBack' ||
    key === 'BrowserBack' ||
    key === 'Exit'
  ) {
    return true
  }

  // Samsung / LG kumanda kodları
  return event.keyCode === 461 || event.keyCode === 10009 || event.keyCode === 179
}

export function isTvBackKey(event: KeyboardEvent) {
  return (
    event.key === 'Escape' ||
    event.key === 'GoBack' ||
    event.key === 'BrowserBack' ||
    event.key === 'Exit' ||
    event.keyCode === 461 ||
    event.keyCode === 10009
  )
}
