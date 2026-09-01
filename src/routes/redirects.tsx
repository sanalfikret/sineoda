import { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocale } from '../i18n/LocaleContext'
import { getEffectiveLocale } from '../i18n/localePreference'
import { localizePathname } from '../i18n/paths'

export function LegacyContentRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { localizePath } = useLocale()
  const contentId = searchParams.get('icerik')

  useEffect(() => {
    if (contentId) {
      navigate(localizePath(`/icerik/${contentId}`), { replace: true })
    }
  }, [contentId, localizePath, navigate])

  return null
}

export function CatchAllRedirect() {
  const { localizePath } = useLocale()
  return <Navigate to={localizePath('/')} replace />
}

/** Bare EN slugs without /en prefix (bookmarks, old links). */
export function LegacyLocaleRedirect({ trPath }: { trPath: string }) {
  const locale = getEffectiveLocale()
  return <Navigate to={localizePathname(trPath, locale)} replace />
}
