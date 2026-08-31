import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { recordCookieConsent } from '../api/client'
import { legalPageHref } from '../constants/legal'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../i18n/LocaleContext'
import { getSessionId } from '../utils/sessionId'

const STORAGE_KEY = 'plooy_cookie_consent'
const LEGACY_STORAGE_KEY = 'sineoda_cookie_consent'

async function persistCookieChoice(choice: 'accepted' | 'essential-only', userName?: string) {
  try {
    await recordCookieConsent({
      choice,
      sessionId: getSessionId(),
      userName,
    })
  } catch {
    /* Ağ hatası — yerel kayıt yeterli */
  }
}

export function CookieConsent() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const { localizePath } = useLocale()
  const [visible, setVisible] = useState(false)
  const returnTo = `${location.pathname}${location.search}`

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!saved) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    void persistCookieChoice('accepted', user?.name)
    setVisible(false)
  }

  const rejectOptional = () => {
    localStorage.setItem(STORAGE_KEY, 'essential-only')
    void persistCookieChoice('essential-only', user?.name)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-white/10 bg-[#11141c]/95 p-5 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-white/85">
          <p className="font-medium text-white">{t('cookie.title')}</p>
          <p className="mt-1 text-plooy-muted">
            {t('cookie.body')}{' '}
            <Link
              to={localizePath(legalPageHref('cerez-politikasi', returnTo))}
              className="text-plooy-gold hover:underline"
            >
              {t('cookie.policyLink')}
            </Link>
            {t('cookie.bodySuffix')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={rejectOptional}
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/5"
          >
            {t('cookie.essentialOnly')}
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-lg bg-plooy-gold px-4 py-2.5 text-sm font-semibold text-plooy-bg transition hover:brightness-110"
          >
            {t('cookie.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
