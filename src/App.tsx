import { type ReactNode, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { NavRouteGuard } from './components/NavRouteGuard'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminRoute } from './components/admin/AdminRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SearchProvider } from './context/SearchContext'
import { WatchlistProvider } from './context/WatchlistContext'
import { useAuth } from './context/AuthContext'
import { AdminAdsPage } from './pages/admin/AdminAdsPage'
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage'
import { AdminContentFormPage } from './pages/admin/AdminContentFormPage'
import { AdminContentListPage } from './pages/admin/AdminContentListPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminJournalFormPage } from './pages/admin/AdminJournalFormPage'
import { AdminJournalListPage } from './pages/admin/AdminJournalListPage'
import { AdminLegalPage } from './pages/admin/AdminLegalPage'
import { AdminLandingPage } from './pages/admin/AdminLandingPage'
import { AdminWatchAccountingPage } from './pages/admin/AdminWatchAccountingPage'
import { AdminBillingPlansPage } from './pages/admin/AdminBillingPlansPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminCreatorsPage } from './pages/admin/AdminCreatorsPage'
import { AdminStudentCinemaPage } from './pages/admin/AdminStudentCinemaPage'
import { AdminStudentCinemaFormPage } from './pages/admin/AdminStudentCinemaFormPage'
import { AdminCekimNotlariPage } from './pages/admin/AdminCekimNotlariPage'
import { AdminCekimNotlariFormPage } from './pages/admin/AdminCekimNotlariFormPage'
import { AccountPage } from './pages/AccountPage'
import { BrowsePage } from './pages/BrowsePage'
import { CekimNotlariPage } from './pages/CekimNotlariPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { MessagesPage } from './pages/MessagesPage'
import { MyListPage } from './pages/MyListPage'
import { PricingPage } from './pages/PricingPage'
import { PaytrCheckoutPage } from './pages/PaytrCheckoutPage'
import { PaymentSuccessPage } from './pages/PaymentSuccessPage'
import { PaymentFailPage } from './pages/PaymentFailPage'
import { ProfilesPage } from './pages/ProfilesPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LegalPage } from './pages/LegalPage'
import { ContactPage } from './pages/ContactPage'
import { JournalLayout } from './components/journal/JournalLayout'
import { JournalListPage } from './pages/JournalListPage'
import { JournalPostPage } from './pages/JournalPostPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ContentDetailPage } from './pages/ContentDetailPage'
import { SignupPage } from './pages/SignupPage'
import { needsSubscriptionPayment, postLoginPath } from './utils/billing'
import { CreatorRoute } from './components/creator/CreatorRoute'
import { CreatorLoginPage } from './pages/creator/CreatorLoginPage'
import { CreatorRegisterPage } from './pages/creator/CreatorRegisterPage'
import { CreatorDashboardPage } from './pages/creator/CreatorDashboardPage'
import { CreatorPaymentPage } from './pages/creator/CreatorPaymentPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { SiteModeGuard } from './components/SiteModeGuard'
import { WebSiteStructuredData } from './components/StructuredData'
import { useSiteMode } from './context/SiteModeContext'
import { AdminSiteModePage } from './pages/admin/AdminSiteModePage'

function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return (
    <WatchlistProvider>
      <SearchProvider>{children}</SearchProvider>
    </WatchlistProvider>
  )
}

function LegacyContentRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const contentId = searchParams.get('icerik')

  useEffect(() => {
    if (contentId) {
      navigate(`/icerik/${contentId}`, { replace: true })
    }
  }, [contentId, navigate])

  return null
}

function HomeRoute() {
  const { user, activeProfile, isLoading, isCreator } = useAuth()
  const { loading: siteModeLoading, siteMode, canBypassComingSoon } = useSiteMode()

  if (isLoading || siteModeLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (siteMode?.enabled && !canBypassComingSoon) {
    if (user && isCreator) {
      return <Navigate to="/creator" replace />
    }
    return <ComingSoonPage />
  }

  if (user && isCreator) {
    return <Navigate to="/creator" replace />
  }

  if (user && needsSubscriptionPayment(user)) {
    return <Navigate to={postLoginPath(user)} replace />
  }

  if (user && activeProfile) {
    return (
      <AuthenticatedProviders>
        <BrowsePage />
      </AuthenticatedProviders>
    )
  }

  if (user && !activeProfile) {
    return <Navigate to="/profiller" replace />
  }

  return (
    <>
      <LegacyContentRedirect />
      <LandingPage />
    </>
  )
}

function TanitimRoute() {
  const { loading, siteMode, canBypassComingSoon } = useSiteMode()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (siteMode?.enabled && !canBypassComingSoon) {
    return <ComingSoonPage />
  }

  return <LandingPage />
}

function App() {
  return (
    <>
      <WebSiteStructuredData />
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/tanitim" element={<TanitimRoute />} />
      <Route path="/giris" element={<SiteModeGuard><LoginPage /></SiteModeGuard>} />
      <Route path="/kayit" element={<SiteModeGuard mode="signup"><SignupPage /></SiteModeGuard>} />
      <Route path="/eposta-dogrula" element={<VerifyEmailPage />} />
      <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
      <Route path="/sifre-sifirla" element={<ResetPasswordPage />} />
      <Route path="/planlar" element={<SiteModeGuard mode="signup"><PricingPage /></SiteModeGuard>} />
      <Route path="/yasal/:slug" element={<LegalPage />} />
      <Route path="/iletisim" element={<ContactPage />} />
      <Route
        path="/dergi"
        element={
          <SiteModeGuard>
            <NavRouteGuard>
              <JournalLayout />
            </NavRouteGuard>
          </SiteModeGuard>
        }
      >
        <Route index element={<JournalListPage />} />
        <Route path=":slug" element={<JournalPostPage />} />
      </Route>
      <Route path="/odeme/paytr" element={<PaytrCheckoutPage />} />
      <Route path="/odeme/basarili" element={<PaymentSuccessPage />} />
      <Route path="/odeme/basarisiz" element={<PaymentFailPage />} />
      <Route
        path="/hesap"
        element={
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profiller"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireSubscription>
              <ProfilesPage />
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/mesajlar"
        element={
          <ProtectedRoute>
            <AuthenticatedProviders>
              <MessagesPage />
            </AuthenticatedProviders>
          </ProtectedRoute>
        }
      />
      <Route
        path="/listem"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard>
                  <MyListPage />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/icerik/:id"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <ContentDetailPage />
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/diziler"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard contentType="dizi">
                  <BrowsePage contentType="dizi" pageTitle="Diziler" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/filmler"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard contentType="film">
                  <BrowsePage contentType="film" pageTitle="Filmler" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/belgeseller"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard contentType="belgesel">
                  <BrowsePage contentType="belgesel" pageTitle="Belgeseller" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/stand-up"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard contentType="stand-up">
                  <BrowsePage contentType="stand-up" pageTitle="Stand-up" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/dikey-diziler"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard verticalOnly>
                  <BrowsePage verticalOnly pageTitle="Dikey Diziler" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/genc-sinema"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard studentCinemaOnly>
                  <BrowsePage studentCinemaOnly pageTitle="Genç Sinema" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/cekim-notlari"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard cekimNotlariOnly>
                  <CekimNotlariPage />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />
      <Route
        path="/kisa-filmler"
        element={
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <BrowsePage contentType="kisa-film" pageTitle="Kısa Filmler" />
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        }
      />

      <Route path="/admin/giris" element={<AdminLoginPage />} />
      <Route path="/creator/giris" element={<CreatorLoginPage />} />
      <Route path="/creator/kayit" element={<CreatorRegisterPage />} />
      <Route
        path="/creator/odeme"
        element={
          <CreatorRoute>
            <CreatorPaymentPage />
          </CreatorRoute>
        }
      />
      <Route
        path="/creator"
        element={
          <CreatorRoute>
            <CreatorDashboardPage />
          </CreatorRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="icerikler" element={<AdminContentListPage />} />
        <Route path="icerikler/yeni" element={<AdminContentFormPage />} />
        <Route path="icerikler/:id" element={<AdminContentFormPage />} />
        <Route path="kategoriler" element={<AdminCategoriesPage />} />
        <Route path="reklamlar" element={<AdminAdsPage />} />
        <Route path="ana-sayfa" element={<AdminLandingPage />} />
        <Route path="yakinda" element={<AdminSiteModePage />} />
        <Route path="dergi" element={<AdminJournalListPage />} />
        <Route path="yasal" element={<AdminLegalPage />} />
        <Route path="dergi/yeni" element={<AdminJournalFormPage />} />
        <Route path="dergi/:id" element={<AdminJournalFormPage />} />
        <Route path="kullanicilar" element={<AdminUsersPage />} />
        <Route path="yapimcilar" element={<AdminCreatorsPage />} />
        <Route path="planlar" element={<AdminBillingPlansPage />} />
        <Route path="muhasebe" element={<AdminWatchAccountingPage />} />
        <Route path="genc-sinema" element={<AdminStudentCinemaPage />} />
        <Route path="genc-sinema/:id" element={<AdminStudentCinemaFormPage />} />
        <Route path="cekim-notlari" element={<AdminCekimNotlariPage />} />
        <Route path="cekim-notlari/:id" element={<AdminCekimNotlariFormPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default App
