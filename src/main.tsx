import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './context/AuthContext'
import { SiteModeProvider } from './context/SiteModeContext'
import { ContentProvider } from './context/ContentContext'
import { InstallAppProvider } from './context/InstallAppContext'
import './index.css'
import './i18n'
import { LocaleProvider } from './i18n/LocaleContext'
import { LocaleSync } from './i18n/LocaleSync'
import { AnalyticsTracker } from './components/AnalyticsTracker'
import { CookieConsent } from './components/CookieConsent'
import { InstallPrompt } from './components/InstallPrompt'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <LocaleSync />
        <AuthProvider>
          <SiteModeProvider>
            <ContentProvider>
              <InstallAppProvider>
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
  </StrictMode>,
)

try {
  registerSW({
    immediate: false,
    onNeedRefresh() {
      // Admin düzenleme sırasında otomatik sayfa yenilemesi yapma.
    },
  })
} catch {
  // PWA / service worker opsiyonel — statik hostingde uygulama yine açılsın.
}

window.setTimeout(() => {
  const root = document.getElementById('root')
  if (root && root.childElementCount === 0) {
    root.innerHTML =
      '<div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#090a0e;color:#e8eaef;font-family:system-ui,sans-serif;text-align:center">' +
      '<div><p style="font-size:18px;font-weight:600;margin:0 0 8px">Sayfa yüklenemedi</p>' +
      '<p style="margin:0 0 16px;color:#9aa3b5;font-size:14px">Eski önbellek veya bağlantı sorunu olabilir.</p>' +
      '<button type="button" onclick="location.reload()" style="cursor:pointer;border:0;border-radius:8px;padding:10px 18px;background:#c9a962;color:#090a0e;font-weight:700">Yeniden dene</button></div></div>'
  }
}, 10000)
