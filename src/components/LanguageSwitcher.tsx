import type { ComponentProps, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/LocaleContext'
import { markLocaleManual } from '../i18n/localePreference'
import { switchLocalePath } from '../i18n/paths'

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()

  const switchTo = (target: 'tr' | 'en') => {
    if (locale === target) return
    markLocaleManual(target)
    navigate(switchLocalePath(`${location.pathname}${location.search}`, target))
  }

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs font-semibold ${className}`.trim()}
      role="group"
      aria-label={t('language.switchTo')}
    >
      <button
        type="button"
        onClick={() => switchTo('tr')}
        className={`rounded-md px-2 py-1 transition ${
          locale === 'tr' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
        }`}
        aria-current={locale === 'tr' ? 'true' : undefined}
      >
        {t('language.tr')}
      </button>
      <button
        type="button"
        onClick={() => switchTo('en')}
        className={`rounded-md px-2 py-1 transition ${
          locale === 'en' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
        }`}
        aria-current={locale === 'en' ? 'true' : undefined}
      >
        {t('language.en')}
      </button>
    </div>
  )
}

/** Link that preserves locale when given a TR canonical path. */
export function LocalizedLink({
  to,
  children,
  className,
  onClick,
  ...rest
}: {
  to: string
  children: ReactNode
  className?: string
  onClick?: () => void
} & Omit<ComponentProps<typeof Link>, 'to' | 'children' | 'className' | 'onClick'>) {
  const { localizePath } = useLocale()
  return (
    <Link to={localizePath(to)} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  )
}
