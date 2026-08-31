export type InstallPlatform = 'ios' | 'android' | 'android-tv' | 'tv' | 'desktop' | 'unknown'

const DISMISS_KEY = 'plooy-install-dismissed-until'
const AUTO_PROMPT_KEY = 'plooy-install-auto-prompted'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function isStandaloneDisplayMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export function detectInstallPlatform(): InstallPlatform {
  const ua = navigator.userAgent
  const uaLower = ua.toLowerCase()

  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'

  if (/Android/i.test(ua)) {
    if (/googletv|android tv|aft[bmtst]|nexus player|shield/i.test(uaLower)) return 'android-tv'
    return 'android'
  }

  if (
    /smart-tv|smarttv|googletv|appletv|hbbtv|tizen|web0s|webos|crkey|firetv|bravia|viera|netcast/i.test(
      uaLower,
    )
  ) {
    return 'tv'
  }

  if (/Windows|Macintosh|Linux/i.test(ua)) return 'desktop'
  return 'unknown'
}

export function isTvInstallPlatform(platform: InstallPlatform) {
  return platform === 'tv' || platform === 'android-tv'
}

export function isInstallBannerDismissed() {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    return until > Date.now()
  } catch {
    return false
  }
}

export function dismissInstallBanner(days = 14) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000))
  } catch {
    // ignore
  }
}

export function clearInstallBannerDismissal() {
  try {
    localStorage.removeItem(DISMISS_KEY)
  } catch {
    // ignore
  }
}

export function wasAutoInstallPrompted() {
  try {
    return sessionStorage.getItem(AUTO_PROMPT_KEY) === '1'
  } catch {
    return false
  }
}

export function markAutoInstallPrompted() {
  try {
    sessionStorage.setItem(AUTO_PROMPT_KEY, '1')
  } catch {
    // ignore
  }
}

export function isMobileInstallPlatform(platform: InstallPlatform) {
  return platform === 'ios' || platform === 'android'
}
