import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageFooter } from './PageFooter'
import { PlooyLogo } from './PlooyLogo'
import { useLocale } from '../i18n/LocaleContext'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  backTo?: string
}

export function AuthLayout({ children, title, subtitle, backTo }: AuthLayoutProps) {
  const { localizePath } = useLocale()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="relative min-h-dvh overflow-hidden bg-plooy-bg">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=900&fit=crop)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-plooy-bg/60 via-plooy-bg/90 to-plooy-bg" />

      <div className="safe-top relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-10 sm:px-6">
        {backTo ? (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="mb-4 inline-flex items-center self-start rounded-md px-1 py-2 text-sm text-plooy-muted transition hover:text-white"
          >
            ← {t('auth.back')}
          </button>
        ) : null}

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-8 flex justify-center">
            <PlooyLogo tone="on-dark" linked linkTo={localizePath('/')} className="h-10 sm:h-12" />
          </div>

          <div className="w-full rounded-2xl border border-white/10 bg-plooy-surface/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
            <h1 className="text-center text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="mt-2 text-center text-sm text-plooy-muted">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  )
}
