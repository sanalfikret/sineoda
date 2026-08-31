import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageMeta } from '../components/PageMeta'
import { PlooyLogo } from '../components/PlooyLogo'
import { SiteFooter } from '../components/SiteFooter'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useSiteMode } from '../context/SiteModeContext'
import { useLocale } from '../i18n/LocaleContext'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import { formatLaunchDate, getCountdownParts } from '../utils/countdown'

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#11141c]/90 px-4 py-5 text-center backdrop-blur sm:min-w-[5.5rem] sm:px-5">
      <p className="text-3xl font-bold tabular-nums text-white sm:text-4xl">{String(value).padStart(2, '0')}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-plooy-muted">{label}</p>
    </div>
  )
}

export function ComingSoonPage() {
  const { t } = useTranslation()
  const { locale, localizePath } = useLocale()
  const { siteMode, loading } = useSiteMode()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (loading || !siteMode) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  const countdown = getCountdownParts(siteMode.launchAt, now)
  const launchLabel = formatLaunchDate(siteMode.launchAt, locale)

  return (
    <div className="relative min-h-dvh overflow-hidden bg-plooy-bg text-white">
      <PageMeta
        title={t('comingSoon.badge')}
        description={`${BRAND_NAME} — ${siteMode.subheadline}`}
        path="/"
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-plooy-gold/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="safe-top relative mx-auto flex min-h-dvh max-w-4xl flex-col px-5 py-10 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <PlooyLogo tone="on-dark" className="h-8" linked linkTo={localizePath('/')} />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to={localizePath('/creator/giris')}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              {t('comingSoon.creatorLogin')}
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-plooy-gold">{t('comingSoon.badge')}</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            {siteMode.headline}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/70 sm:text-lg">{siteMode.subheadline}</p>
          <p className="mt-2 text-sm text-plooy-muted">{BRAND_TAGLINE}</p>

          {!countdown.expired && siteMode.launchAt ? (
            <div className="mt-10 w-full">
              <p className="mb-4 text-sm text-plooy-muted">
                {launchLabel
                  ? t('comingSoon.membershipOpens', { date: launchLabel })
                  : t('comingSoon.membershipOpensSoon')}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <CountdownUnit value={countdown.days} label={t('comingSoon.day')} />
                <CountdownUnit value={countdown.hours} label={t('comingSoon.hour')} />
                <CountdownUnit value={countdown.minutes} label={t('comingSoon.minute')} />
                <CountdownUnit value={countdown.seconds} label={t('comingSoon.second')} />
              </div>
            </div>
          ) : (
            <p className="mt-10 rounded-xl border border-plooy-gold/30 bg-plooy-gold/10 px-5 py-4 text-sm text-plooy-gold">
              {t('comingSoon.launchPending')}
            </p>
          )}

          <div className="mt-12 grid w-full max-w-xl gap-4 sm:grid-cols-2">
            <Link
              to={localizePath('/creator/kayit')}
              className="rounded-2xl border border-plooy-gold/40 bg-plooy-gold/10 px-6 py-5 text-left transition hover:bg-plooy-gold/15"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-plooy-gold">{t('comingSoon.creators')}</p>
              <p className="mt-2 text-lg font-semibold text-white">{t('comingSoon.filmApply')}</p>
              <p className="mt-2 text-sm text-white/65">{t('comingSoon.filmApplyDesc')}</p>
            </Link>
            <Link
              to={`${localizePath('/creator/kayit')}?program=genc-sinema`}
              className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-6 py-5 text-left transition hover:bg-emerald-500/15"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{t('comingSoon.studentCinema')}</p>
              <p className="mt-2 text-lg font-semibold text-white">{t('comingSoon.studentApply')}</p>
              <p className="mt-2 text-sm text-white/65">{t('comingSoon.studentApplyDesc')}</p>
            </Link>
          </div>

          <p className="mt-8 max-w-lg text-sm text-plooy-muted">{t('comingSoon.viewerClosed')}</p>
        </main>

        <SiteFooter />
      </div>
    </div>
  )
}
