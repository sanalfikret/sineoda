import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { setI18nLocale } from './index'
import { detectLocale } from './paths'

/** Keeps i18n language and `<html lang>` in sync with the URL prefix. */
export function LocaleSync() {
  const { pathname } = useLocation()

  useEffect(() => {
    setI18nLocale(detectLocale(pathname))
  }, [pathname])

  return null
}
