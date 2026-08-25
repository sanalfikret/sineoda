import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  type BeforeInstallPromptEvent,
  detectInstallPlatform,
  dismissInstallBanner,
  isInstallBannerDismissed,
  isStandaloneDisplayMode,
  type InstallPlatform,
} from '../utils/pwaInstall'

interface InstallAppContextValue {
  platform: InstallPlatform
  isStandalone: boolean
  canNativeInstall: boolean
  isBannerDismissed: boolean
  installApp: () => Promise<void>
  openInstallGuide: () => void
  dismissBanner: () => void
}

const InstallAppContext = createContext<InstallAppContextValue | null>(null)

export function InstallAppProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [platform, setPlatform] = useState<InstallPlatform>('unknown')
  const [guideOpen, setGuideOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    setIsStandalone(isStandaloneDisplayMode())
    setPlatform(detectInstallPlatform())
    setBannerDismissed(isInstallBannerDismissed())

    const onDisplayModeChange = () => setIsStandalone(isStandaloneDisplayMode())
    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener('change', onDisplayModeChange)

    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      media.removeEventListener('change', onDisplayModeChange)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const promptNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return choice.outcome === 'accepted'
  }, [deferredPrompt])

  const installApp = useCallback(async () => {
    if (isStandalone) return
    if (deferredPrompt) {
      await promptNativeInstall()
      return
    }
    setGuideOpen(true)
  }, [deferredPrompt, isStandalone, promptNativeInstall])

  const openInstallGuide = useCallback(() => {
    if (!isStandalone) setGuideOpen(true)
  }, [isStandalone])

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
      {!isStandalone && guideOpen && (
        <InstallGuideModal
          platform={platform}
          canNativeInstall={Boolean(deferredPrompt)}
          onClose={() => setGuideOpen(false)}
          onNativeInstall={() => void promptNativeInstall()}
        />
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

function InstallGuideModal({
  platform,
  canNativeInstall,
  onClose,
  onNativeInstall,
}: {
  platform: InstallPlatform
  canNativeInstall: boolean
  onClose: () => void
  onNativeInstall: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="safe-top safe-bottom fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-white/10 bg-sineoda-bg shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-guide-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <img src="/icon.svg" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sineoda-gold">Kurulum</p>
              <h2 id="install-guide-title" className="mt-1 text-xl font-bold text-white">
                Sineoda&apos;yı uygulama gibi kullanın
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
          >
            Kapat
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {canNativeInstall ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-white/80">
                Tarayıcınız Sineoda&apos;yı bilgisayarınıza veya telefonunuza uygulama olarak kurmanıza izin veriyor.
              </p>
              <button
                type="button"
                onClick={onNativeInstall}
                className="w-full rounded-lg bg-sineoda-gold py-3 text-sm font-semibold text-sineoda-bg"
              >
                Şimdi yükle
              </button>
            </div>
          ) : (
            <InstallSteps platform={platform} />
          )}
        </div>
      </div>
    </div>
  )
}

function InstallSteps({ platform }: { platform: InstallPlatform }) {
  if (platform === 'ios') {
    return (
      <ol className="space-y-4 text-sm leading-relaxed text-white/80">
        <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-semibold text-white">1.</span> Safari ile siteyi açın (Chrome değil).
        </li>
        <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-semibold text-white">2.</span> Alttaki <strong>Paylaş</strong> düğmesine dokunun.
        </li>
        <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-semibold text-white">3.</span>{' '}
          <strong>Ana Ekrana Ekle</strong> seçeneğini seçin.
        </li>
        <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-semibold text-white">4.</span> Sineoda ana ekranınızda uygulama gibi açılır.
        </li>
      </ol>
    )
  }

  if (platform === 'android') {
    return (
      <ol className="space-y-4 text-sm leading-relaxed text-white/80">
        <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-semibold text-white">1.</span> Chrome ile siteyi açın.
        </li>
        <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-semibold text-white">2.</span> Sağ üstteki menüden{' '}
          <strong>Ana ekrana ekle</strong> veya <strong>Uygulamayı yükle</strong> seçeneğini bulun.
        </li>
        <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-semibold text-white">3.</span> Onaylayın; Sineoda uygulama simgesiyle açılır.
        </li>
      </ol>
    )
  }

  return (
    <ol className="space-y-4 text-sm leading-relaxed text-white/80">
      <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="font-semibold text-white">1.</span> Chrome veya Edge ile siteyi açın.
      </li>
      <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="font-semibold text-white">2.</span> Adres çubuğunun sağındaki{' '}
        <strong>Yükle / Bilgisayara ekle</strong> simgesine tıklayın.
      </li>
      <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="font-semibold text-white">3.</span> Alternatif: menüden{' '}
        <strong>Uygulamayı yükle</strong> veya <strong>Ana ekrana ekle</strong>.
      </li>
      <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="font-semibold text-white">4.</span> Sineoda masaüstünde ayrı bir pencere gibi çalışır.
      </li>
    </ol>
  )
}
