import { useInstallApp } from '../context/InstallAppContext'

interface InstallAppButtonProps {
  className?: string
  variant?: 'primary' | 'ghost' | 'link'
  label?: string
  onClick?: () => void
}

export function InstallAppButton({
  className = '',
  variant = 'ghost',
  label = 'Yükle',
  onClick,
}: InstallAppButtonProps) {
  const { isStandalone, installApp } = useInstallApp()

  if (isStandalone) return null

  const styles =
    variant === 'primary'
      ? 'rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg hover:brightness-110'
      : variant === 'link'
        ? 'text-sm text-sineoda-gold hover:underline'
        : 'rounded-lg border border-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/5'

  return (
    <button
      type="button"
      className={`${styles} ${className}`.trim()}
      onClick={() => {
        onClick?.()
        void installApp()
      }}
    >
      {label}
    </button>
  )
}

export function InstallAppMenuItem({ onNavigate }: { onNavigate?: () => void }) {
  const { isStandalone, installApp } = useInstallApp()

  if (isStandalone) return null

  return (
    <button
      type="button"
      className="block w-full px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 tv:py-3 tv:text-base"
      onClick={() => {
        onNavigate?.()
        void installApp()
      }}
    >
      Yükle
    </button>
  )
}

export function InstallAppStatusCard() {
  const { isStandalone, installApp } = useInstallApp()

  return (
    <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
      <h2 className="text-lg font-semibold text-white">Mobil uygulama</h2>
      {isStandalone ? (
        <p className="mt-2 text-sm text-emerald-300">
          Sineoda telefonunuza yüklü. Ana ekrandan uygulama gibi açılır.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-sineoda-muted">
            Sineoda&apos;yı telefona uygulama olarak yükleyin — mağaza veya APK gerekmez.
          </p>
          <button
            type="button"
            onClick={() => void installApp()}
            className="mt-4 rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg hover:brightness-110"
          >
            Yükle
          </button>
        </>
      )}
    </section>
  )
}
