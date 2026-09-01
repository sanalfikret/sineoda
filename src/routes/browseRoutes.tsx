import type { ReactNode } from 'react'
import { NavRouteGuard } from '../components/NavRouteGuard'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { SiteModeGuard } from '../components/SiteModeGuard'
import { localeRoutes } from '../i18n/LocaleRoute'
import type { ContentType } from '../types/content'
import { BrowsePage } from '../pages/BrowsePage'
import { CekimNotlariPage } from '../pages/CekimNotlariPage'
import { AuthenticatedProviders } from './providers'

function memberBrowse(element: ReactNode, options?: { requireProfile?: boolean }) {
  const requireProfile = options?.requireProfile ?? true
  return (
    <SiteModeGuard>
      <ProtectedRoute requireProfile={requireProfile} requireSubscription>
        <AuthenticatedProviders>{element}</AuthenticatedProviders>
      </ProtectedRoute>
    </SiteModeGuard>
  )
}

function browseByType(contentType: ContentType) {
  return memberBrowse(
    <NavRouteGuard contentType={contentType}>
      <BrowsePage contentType={contentType} />
    </NavRouteGuard>,
  )
}

export function browseRoutes() {
  return [
    ...localeRoutes({
      tr: '/diziler',
      en: '/en/series',
      element: browseByType('dizi'),
    }),
    ...localeRoutes({
      tr: '/filmler',
      en: '/en/films',
      element: browseByType('film'),
    }),
    ...localeRoutes({
      tr: '/belgeseller',
      en: '/en/documentaries',
      element: browseByType('belgesel'),
    }),
    ...localeRoutes({
      tr: '/stand-up',
      en: '/en/stand-up',
      element: browseByType('stand-up'),
    }),
    ...localeRoutes({
      tr: '/klasikler',
      en: '/en/classics',
      element: memberBrowse(
        <NavRouteGuard classicsOnly>
          <BrowsePage classicsOnly />
        </NavRouteGuard>,
      ),
    }),
    ...localeRoutes({
      tr: '/dikey-diziler',
      en: '/en/vertical-series',
      element: memberBrowse(
        <NavRouteGuard verticalOnly>
          <BrowsePage verticalOnly />
        </NavRouteGuard>,
      ),
    }),
    ...localeRoutes({
      tr: '/genc-sinema',
      en: '/en/student-cinema',
      element: memberBrowse(
        <NavRouteGuard studentCinemaOnly>
          <BrowsePage studentCinemaOnly />
        </NavRouteGuard>,
      ),
    }),
    ...localeRoutes({
      tr: '/cekim-notlari',
      en: '/en/production-notes',
      element: memberBrowse(
        <NavRouteGuard cekimNotlariOnly>
          <CekimNotlariPage />
        </NavRouteGuard>,
      ),
    }),
    ...localeRoutes({
      tr: '/kisa-filmler',
      en: '/en/short-films',
      element: memberBrowse(<BrowsePage contentType="kisa-film" />),
    }),
  ]
}
