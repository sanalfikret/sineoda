import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './context/AuthContext'
import { ContentProvider } from './context/ContentContext'
import './index.css'
import { AnalyticsTracker } from './components/AnalyticsTracker'
import { CookieConsent } from './components/CookieConsent'
import App from './App.tsx'

registerSW({
  immediate: true,
  onNeedRefresh() {
    // Admin düzenleme sırasında otomatik sayfa yenilemesi yapma.
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ContentProvider>
          <AnalyticsTracker />
          <App />
          <CookieConsent />
        </ContentProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
