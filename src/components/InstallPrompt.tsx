import { useInstallApp } from '../context/InstallAppContext'

export function InstallPrompt() {
  const { isStandalone, canNativeInstall, isBannerDismissed, installApp, dismissBanner, platform } =
    useInstallApp()

  const showMobileInstall = platform === 'ios' || platform === 'android'
  const showBanner =
    !isStandalone && !isBannerDismissed && (canNativeInstall || showMobileInstall)

  if (!showBanner) return null

  const title = 'Plooy\'yu telefona yükle'

  const description = canNativeInstall
    ? 'App Store gerekmez — yükle, ana ekrandan uygulama gibi aç.'
    : platform === 'ios'
      ? 'Safari ile yükle; tam ekran, tarayıcı çubuğu yok.'
      : 'Chrome ile yükle; ana ekranda uygulama simgesi oluşur.'

  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm sm:px-0">
      <div className="pointer-events-auto rounded-2xl border border-white/10 bg-plooy-elevated/95 p-3.5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/pwa-192x192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-plooy-muted">{description}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void installApp()}
            className="flex-1 rounded-lg bg-plooy-gold px-3 py-2.5 text-sm font-semibold text-plooy-bg transition hover:brightness-110"
          >
            Yükle
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            className="rounded-lg px-3 py-2.5 text-sm text-plooy-muted transition hover:text-white"
          >
            Sonra
          </button>
        </div>
      </div>
    </div>
  )
}
