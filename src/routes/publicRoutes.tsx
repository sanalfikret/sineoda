import { Route } from 'react-router-dom'
import { JournalLayout } from '../components/journal/JournalLayout'
import { NavRouteGuard } from '../components/NavRouteGuard'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { SiteModeGuard } from '../components/SiteModeGuard'
import { localeRoutes } from '../i18n/LocaleRoute'
import { AccountPage } from '../pages/AccountPage'
import { ContactPage } from '../pages/ContactPage'
import { ContentDetailPage } from '../pages/ContentDetailPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { JournalListPage } from '../pages/JournalListPage'
import { JournalPostPage } from '../pages/JournalPostPage'
import { LegalPage } from '../pages/LegalPage'
import { LoginPage } from '../pages/LoginPage'
import { MessagesPage } from '../pages/MessagesPage'
import { MyListPage } from '../pages/MyListPage'
import { WatchHistoryPage } from '../pages/WatchHistoryPage'
import { PaytrCheckoutPage } from '../pages/PaytrCheckoutPage'
import { PaymentFailPage } from '../pages/PaymentFailPage'
import { PaymentSuccessPage } from '../pages/PaymentSuccessPage'
import { PricingPage } from '../pages/PricingPage'
import { ProfilesPage } from '../pages/ProfilesPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { SignupPage } from '../pages/SignupPage'
import { VerifyEmailPage } from '../pages/VerifyEmailPage'
import { EmailChangeConfirmPage } from '../pages/EmailChangeConfirmPage'
import { AuthenticatedProviders } from './providers'

export function publicRoutes() {
  return [
    ...localeRoutes({
      tr: '/giris',
      en: '/en/login',
      element: (
        <SiteModeGuard>
          <LoginPage />
        </SiteModeGuard>
      ),
    }),
    ...localeRoutes({
      tr: '/kayit',
      en: '/en/signup',
      element: (
        <SiteModeGuard mode="signup">
          <SignupPage />
        </SiteModeGuard>
      ),
    }),
    ...localeRoutes({ tr: '/eposta-dogrula', en: '/en/verify-email', element: <VerifyEmailPage /> }),
    ...localeRoutes({ tr: '/eposta-degistir', en: '/en/confirm-email-change', element: <EmailChangeConfirmPage /> }),
    ...localeRoutes({ tr: '/sifremi-unuttum', en: '/en/forgot-password', element: <ForgotPasswordPage /> }),
    ...localeRoutes({ tr: '/sifre-sifirla', en: '/en/reset-password', element: <ResetPasswordPage /> }),
    ...localeRoutes({
      tr: '/planlar',
      en: '/en/plans',
      element: (
        <SiteModeGuard mode="signup">
          <PricingPage />
        </SiteModeGuard>
      ),
    }),
    ...localeRoutes({ tr: '/yasal/:slug', en: '/en/legal/:slug', element: <LegalPage /> }),
    ...localeRoutes({ tr: '/iletisim', en: '/en/contact', element: <ContactPage /> }),
    ...localeRoutes({
      tr: '/dergi',
      en: '/en/journal',
      element: (
        <SiteModeGuard>
          <NavRouteGuard>
            <JournalLayout />
          </NavRouteGuard>
        </SiteModeGuard>
      ),
      children: (
        <>
          <Route index element={<JournalListPage />} />
          <Route path=":slug" element={<JournalPostPage />} />
        </>
      ),
    }),
    ...localeRoutes({ tr: '/odeme/paytr', en: '/en/payment/paytr', element: <PaytrCheckoutPage /> }),
    ...localeRoutes({ tr: '/odeme/basarili', en: '/en/payment/success', element: <PaymentSuccessPage /> }),
    ...localeRoutes({ tr: '/odeme/basarisiz', en: '/en/payment/failed', element: <PaymentFailPage /> }),
    ...localeRoutes({
      tr: '/hesap',
      en: '/en/account',
      element: (
        <ProtectedRoute>
          <AccountPage />
        </ProtectedRoute>
      ),
    }),
    ...localeRoutes({
      tr: '/profiller',
      en: '/en/profiles',
      element: (
        <SiteModeGuard>
          <ProtectedRoute requireSubscription>
            <ProfilesPage />
          </ProtectedRoute>
        </SiteModeGuard>
      ),
    }),
    ...localeRoutes({
      tr: '/mesajlar',
      en: '/en/messages',
      element: (
        <ProtectedRoute>
          <AuthenticatedProviders>
            <MessagesPage />
          </AuthenticatedProviders>
        </ProtectedRoute>
      ),
    }),
    ...localeRoutes({
      tr: '/listem',
      en: '/en/my-list',
      element: (
        <SiteModeGuard>
          <ProtectedRoute requireProfile requireSubscription>
            <AuthenticatedProviders>
              <NavRouteGuard>
                <MyListPage />
              </NavRouteGuard>
            </AuthenticatedProviders>
          </ProtectedRoute>
        </SiteModeGuard>
      ),
    }),
    ...localeRoutes({
      tr: '/izleme-gecmisi',
      en: '/en/watch-history',
      element: (
        <SiteModeGuard>
          <ProtectedRoute requireProfile requireSubscription>
            <AuthenticatedProviders>
              <NavRouteGuard>
                <WatchHistoryPage />
              </NavRouteGuard>
            </AuthenticatedProviders>
          </ProtectedRoute>
        </SiteModeGuard>
      ),
    }),
    ...localeRoutes({
      tr: '/icerik/:id',
      en: '/en/content/:id',
      element: (
        <SiteModeGuard>
          <ProtectedRoute requireProfile requireSubscription>
            <AuthenticatedProviders>
              <ContentDetailPage />
            </AuthenticatedProviders>
          </ProtectedRoute>
        </SiteModeGuard>
      ),
    }),
  ]
}
