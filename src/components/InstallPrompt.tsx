import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)

    setIsStandalone(standalone)

    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isStandalone || dismissed || !deferredPrompt) {
    return null
  }

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return (
    <div className="safe-bottom fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-2xl border border-white/10 bg-sineoda-elevated/95 p-4 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:right-6 sm:left-auto">
      <div className="flex items-start gap-3">
        <img src="/icon.svg" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">Sineoda&apos;yı telefona ekle</p>
          <p className="mt-1 text-sm text-sineoda-muted">
            Uygulama mağazasına gerek yok — ana ekranına ekleyip tam ekran kullan.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              Yükle
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
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
