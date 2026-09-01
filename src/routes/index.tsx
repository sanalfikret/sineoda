import { Route, Routes } from 'react-router-dom'
import { WebSiteStructuredData } from '../components/StructuredData'
import { localeRoutes } from '../i18n/LocaleRoute'
import { adminRoutes } from './adminRoutes'
import { browseRoutes } from './browseRoutes'
import { creatorRoutes } from './creatorRoutes'
import { HomeRoute, TanitimRoute } from './home'
import { publicRoutes } from './publicRoutes'
import { CatchAllRedirect, LegacyLocaleRedirect } from './redirects'
import { LEGACY_EN_REDIRECTS } from './registry'

export function AppRoutes() {
  return (
    <>
      <WebSiteStructuredData />
      <Routes>
        {localeRoutes({ tr: '/', en: '/en', element: <HomeRoute /> })}
        {localeRoutes({ tr: '/tanitim', en: '/en/about', element: <TanitimRoute /> })}
        {publicRoutes()}
        {browseRoutes()}
        {adminRoutes()}
        {creatorRoutes()}
        {LEGACY_EN_REDIRECTS.map(({ from, trPath }) => (
          <Route key={from} path={from} element={<LegacyLocaleRedirect trPath={trPath} />} />
        ))}
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </>
  )
}
