import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './context/AuthContext'
import { ContentProvider } from './context/ContentContext'
import { InstallAppProvider } from './context/InstallAppContext'
import './index.css'
import { AnalyticsTracker } from './components/AnalyticsTracker'
import { CookieConsent } from './components/CookieConsent'
import { InstallPrompt } from './components/InstallPrompt'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ContentProvider>
          <InstallAppProvider>
            <AnalyticsTracker />
            <App />
            <InstallPrompt />
            <CookieConsent />
          </InstallAppProvider>
        </ContentProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

try {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Admin düzenleme sırasında otomatik sayfa yenilemesi yapma.
    },
  })
} catch {
  // PWA / service worker opsiyonel — statik hostingde uygulama yine açılsın.
}
