import { useInstallApp } from '../context/InstallAppContext'

export function InstallPrompt() {
  const { isStandalone, canNativeInstall, isBannerDismissed, installApp, dismissBanner, platform } =
    useInstallApp()

  const showIosHint = platform === 'ios' && !canNativeInstall
  const showBanner = !isStandalone && !isBannerDismissed && (canNativeInstall || showIosHint)

  if (!showBanner) return null

  const title =
    platform === 'desktop'
      ? 'Sineoda\'yı masaüstüne ekle'
      : platform === 'ios'
        ? 'Sineoda\'yı ana ekrana ekle'
        : 'Sineoda\'yı uygulama gibi kullanın'

  const description =
    platform === 'desktop'
      ? 'App Store gerekmez — Chrome veya Edge ile bilgisayarınıza uygulama olarak kurun.'
      : platform === 'ios'
        ? 'Safari\'den ana ekrana ekleyerek tam ekran kullanın.'
        : 'Telefona veya bilgisayara ekleyin; mağaza indirmesi gerekmez.'

  return (
    <div className="safe-bottom fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-2xl border border-white/10 bg-sineoda-elevated/95 p-4 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:right-6 sm:left-auto">
      <div className="flex items-start gap-3">
        <img src="/icon.svg" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-sineoda-muted">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void installApp()}
              className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              {canNativeInstall ? 'Yükle' : 'Nasıl yapılır?'}
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              className="rounded-lg px-4 py-2 text-sm text-sineoda-muted transition hover:text-white"
            >
              Sonra
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
