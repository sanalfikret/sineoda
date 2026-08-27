import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  type BeforeInstallPromptEvent,
  detectInstallPlatform,
  dismissInstallBanner,
  isInstallBannerDismissed,
  isMobileInstallPlatform,
  isStandaloneDisplayMode,
  markAutoInstallPrompted,
  type InstallPlatform,
  wasAutoInstallPrompted,
} from '../utils/pwaInstall'

interface InstallAppContextValue {
  platform: InstallPlatform
  isStandalone: boolean
  canNativeInstall: boolean
  isBannerDismissed: boolean
  installApp: () => Promise<boolean>
  openInstallGuide: () => void
  dismissBanner: () => void
}

const InstallAppContext = createContext<InstallAppContextValue | null>(null)

export function InstallAppProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [platform, setPlatform] = useState<InstallPlatform>('unknown')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [hintMessage, setHintMessage] = useState<string | null>(null)
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    deferredPromptRef.current = deferredPrompt
  }, [deferredPrompt])

  const promptNativeInstall = useCallback(async (event?: BeforeInstallPromptEvent | null) => {
    const promptEvent = event ?? deferredPromptRef.current
    if (!promptEvent) return false
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    setDeferredPrompt(null)
    deferredPromptRef.current = null
    return choice.outcome === 'accepted'
  }, [])

  useEffect(() => {
    setIsStandalone(isStandaloneDisplayMode())
    setPlatform(detectInstallPlatform())
    setBannerDismissed(isInstallBannerDismissed())

    const onDisplayModeChange = () => setIsStandalone(isStandaloneDisplayMode())
    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener('change', onDisplayModeChange)

    const handler = (event: Event) => {
      event.preventDefault()
      const installEvent = event as BeforeInstallPromptEvent
      setDeferredPrompt(installEvent)
      deferredPromptRef.current = installEvent

      const currentPlatform = detectInstallPlatform()
      const canAutoPrompt =
        isMobileInstallPlatform(currentPlatform) &&
        !isStandaloneDisplayMode() &&
        !isInstallBannerDismissed() &&
        !wasAutoInstallPrompted()

      if (canAutoPrompt) {
        markAutoInstallPrompted()
        window.setTimeout(() => {
          void promptNativeInstall(installEvent)
        }, 1200)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      media.removeEventListener('change', onDisplayModeChange)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [promptNativeInstall])

  useEffect(() => {
    if (!hintMessage) return
    const timer = window.setTimeout(() => setHintMessage(null), 6000)
    return () => window.clearTimeout(timer)
  }, [hintMessage])

  const installApp = useCallback(async () => {
    if (isStandalone) return false

    if (deferredPromptRef.current) {
      return promptNativeInstall()
    }

    if (platform === 'ios') {
      setHintMessage('Safari → Paylaş → Ana Ekrana Ekle (uygulama gibi açılır)')
      return false
    }

    if (platform === 'android') {
      setHintMessage('Chrome menüsünden "Uygulamayı yükle" seçin')
      return false
    }

    setHintMessage('Adres çubuğundaki "Yükle" simgesine dokunun')
    return false
  }, [isStandalone, platform, promptNativeInstall])

  const openInstallGuide = useCallback(() => {
    if (!isStandalone) void installApp()
  }, [installApp, isStandalone])

  const dismissBanner = useCallback(() => {
    dismissInstallBanner()
    setBannerDismissed(true)
  }, [])

  const value = useMemo<InstallAppContextValue>(
    () => ({
      platform,
      isStandalone,
      canNativeInstall: Boolean(deferredPrompt),
      isBannerDismissed: bannerDismissed,
      installApp,
      openInstallGuide,
      dismissBanner,
    }),
    [platform, isStandalone, deferredPrompt, bannerDismissed, installApp, openInstallGuide, dismissBanner],
  )

  return (
    <InstallAppContext.Provider value={value}>
      {children}
      {hintMessage && (
        <div
          className="safe-bottom pointer-events-none fixed inset-x-4 bottom-20 z-[85] mx-auto max-w-md rounded-xl border border-white/10 bg-sineoda-elevated/95 px-4 py-3 text-center text-sm text-white shadow-xl backdrop-blur-md sm:bottom-6"
          role="status"
        >
          {hintMessage}
        </div>
      )}
    </InstallAppContext.Provider>
  )
}

export function useInstallApp() {
  const context = useContext(InstallAppContext)
  if (!context) {
    throw new Error('useInstallApp must be used within InstallAppProvider')
  }
  return context
}
