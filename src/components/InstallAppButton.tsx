import { useTranslation } from 'react-i18next'
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
  label,
  onClick,
}: InstallAppButtonProps) {
  const { t } = useTranslation('install')
  const { isStandalone, installApp } = useInstallApp()
  const buttonLabel = label ?? t('install')

  if (isStandalone) return null

  const styles =
    variant === 'primary'
      ? 'rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg hover:brightness-110'
      : variant === 'link'
        ? 'text-sm text-plooy-gold hover:underline'
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
      {buttonLabel}
    </button>
  )
}

export function InstallAppMenuItem({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('install')
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
      {t('install')}
    </button>
  )
}

export function InstallAppStatusCard() {
  const { t } = useTranslation('install')
  const { isStandalone, installApp } = useInstallApp()

  return (
    <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
      <h2 className="text-lg font-semibold text-white">{t('statusTitle')}</h2>
      {isStandalone ? (
        <p className="mt-2 text-sm text-emerald-300">{t('statusInstalled')}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-plooy-muted">{t('statusNotInstalled')}</p>
          <button
            type="button"
            onClick={() => void installApp()}
            className="mt-4 rounded-lg bg-plooy-gold px-4 py-2.5 text-sm font-semibold text-plooy-bg hover:brightness-110"
          >
            {t('install')}
          </button>
        </>
      )}
    </section>
  )
}
