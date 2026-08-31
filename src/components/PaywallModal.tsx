import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/LocaleContext'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  const { t } = useTranslation('content')
  const { t: tc } = useTranslation()
  const { localizePath } = useLocale()

  if (!open) return null

  return (
    <div
      className="safe-top safe-bottom fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-plooy-gold/30 bg-plooy-surface p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plooy-gold">{t('paywall.eyebrow')}</p>
        <h2 className="mt-2 text-2xl font-bold text-white">{t('paywall.title')}</h2>
        <p className="mt-3 text-sm leading-relaxed text-plooy-muted">{t('paywall.body')}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            to={localizePath('/planlar')}
            onClick={onClose}
            className="rounded-lg bg-plooy-gold py-3 text-center text-sm font-semibold text-plooy-bg"
          >
            {t('paywall.viewPlans')}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 py-3 text-sm text-white/80 hover:bg-white/5"
          >
            {tc('actions.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
