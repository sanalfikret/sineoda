export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'unknown'

const DISMISS_KEY = 'sineoda-install-dismissed-until'

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
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Windows|Macintosh|Linux/i.test(ua)) return 'desktop'
  return 'unknown'
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
