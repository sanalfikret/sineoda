import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SiteModeProvider } from './context/SiteModeContext'
import { ContentProvider } from './context/ContentContext'
import { InstallAppProvider } from './context/InstallAppContext'
import { LocaleProvider } from './i18n/LocaleContext'
import { LocaleSync } from './i18n/LocaleSync'
import { AnalyticsTracker } from './components/AnalyticsTracker'
import { CookieConsent } from './components/CookieConsent'
import { InstallPrompt } from './components/InstallPrompt'
import { BootMarker } from './components/BootMarker'
import App from './App'

export default function AppRoot() {
  return (
    <StrictMode>
      <BrowserRouter>
        <LocaleProvider>
          <LocaleSync />
          <AuthProvider>
            <SiteModeProvider>
              <ContentProvider>
                <InstallAppProvider>
                  <BootMarker />
                  <AnalyticsTracker />
                  <App />
                  <InstallPrompt />
                  <CookieConsent />
                </InstallAppProvider>
              </ContentProvider>
            </SiteModeProvider>
          </AuthProvider>
        </LocaleProvider>
      </BrowserRouter>
    </StrictMode>
  )
}
