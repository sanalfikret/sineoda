import { type ReactNode, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminRoute } from './components/admin/AdminRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SearchProvider } from './context/SearchContext'
import { WatchlistProvider } from './context/WatchlistContext'
import { useAuth } from './context/AuthContext'
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage'
import { AdminContentFormPage } from './pages/admin/AdminContentFormPage'
import { AdminContentListPage } from './pages/admin/AdminContentListPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminJournalFormPage } from './pages/admin/AdminJournalFormPage'
import { AdminJournalListPage } from './pages/admin/AdminJournalListPage'
import { AdminLandingPage } from './pages/admin/AdminLandingPage'
import { AdminWatchAccountingPage } from './pages/admin/AdminWatchAccountingPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminCreatorsPage } from './pages/admin/AdminCreatorsPage'
import { AdminStudentCinemaPage } from './pages/admin/AdminStudentCinemaPage'
import { AdminStudentCinemaFormPage } from './pages/admin/AdminStudentCinemaFormPage'
import { AccountPage } from './pages/AccountPage'
import { BrowsePage } from './pages/BrowsePage'
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
import { CreatorRoute } from './components/creator/CreatorRoute'
import { CreatorLoginPage } from './pages/creator/CreatorLoginPage'
import { CreatorRegisterPage } from './pages/creator/CreatorRegisterPage'
import { CreatorDashboardPage } from './pages/creator/CreatorDashboardPage'

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

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sineoda-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  if (user && isCreator) {
    return <Navigate to="/creator" replace />
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/tanitim" element={<LandingPage />} />
      <Route path="/giris" element={<LoginPage />} />
      <Route path="/kayit" element={<SignupPage />} />
      <Route path="/eposta-dogrula" element={<VerifyEmailPage />} />
      <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
      <Route path="/sifre-sifirla" element={<ResetPasswordPage />} />
      <Route path="/planlar" element={<PricingPage />} />
      <Route path="/yasal/:slug" element={<LegalPage />} />
      <Route path="/iletisim" element={<ContactPage />} />
      <Route path="/dergi" element={<JournalLayout />}>
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
          <ProtectedRoute>
            <ProfilesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mesajlar"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/listem"
        element={
          <ProtectedRoute requireProfile>
            <AuthenticatedProviders>
              <MyListPage />
            </AuthenticatedProviders>
          </ProtectedRoute>
        }
      />
      <Route
        path="/icerik/:id"
        element={
          <ProtectedRoute requireProfile>
            <AuthenticatedProviders>
              <ContentDetailPage />
            </AuthenticatedProviders>
          </ProtectedRoute>
        }
      />
      <Route
        path="/diziler"
        element={
          <ProtectedRoute requireProfile>
            <AuthenticatedProviders>
              <BrowsePage contentType="dizi" pageTitle="Diziler" />
            </AuthenticatedProviders>
          </ProtectedRoute>
        }
      />
      <Route
        path="/filmler"
        element={
          <ProtectedRoute requireProfile>
            <AuthenticatedProviders>
              <BrowsePage contentType="film" pageTitle="Filmler" />
            </AuthenticatedProviders>
          </ProtectedRoute>
        }
      />
      <Route
        path="/belgeseller"
        element={
          <ProtectedRoute requireProfile>
            <AuthenticatedProviders>
              <BrowsePage contentType="belgesel" pageTitle="Belgeseller" />
            </AuthenticatedProviders>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dikey-diziler"
        element={
          <ProtectedRoute requireProfile>
            <AuthenticatedProviders>
              <BrowsePage verticalOnly pageTitle="Dikey Diziler" />
            </AuthenticatedProviders>
          </ProtectedRoute>
        }
      />
      <Route
        path="/genc-sinema"
        element={
          <ProtectedRoute requireProfile>
            <AuthenticatedProviders>
              <BrowsePage studentCinemaOnly pageTitle="Genç Sinema" />
            </AuthenticatedProviders>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kisa-filmler"
        element={
          <ProtectedRoute requireProfile>
            <AuthenticatedProviders>
              <BrowsePage contentType="kisa-film" pageTitle="Kısa Filmler" />
            </AuthenticatedProviders>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/giris" element={<AdminLoginPage />} />
      <Route path="/creator/giris" element={<CreatorLoginPage />} />
      <Route path="/creator/kayit" element={<CreatorRegisterPage />} />
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
        <Route path="ana-sayfa" element={<AdminLandingPage />} />
        <Route path="dergi" element={<AdminJournalListPage />} />
        <Route path="dergi/yeni" element={<AdminJournalFormPage />} />
        <Route path="dergi/:id" element={<AdminJournalFormPage />} />
        <Route path="kullanicilar" element={<AdminUsersPage />} />
        <Route path="yapimcilar" element={<AdminCreatorsPage />} />
        <Route path="muhasebe" element={<AdminWatchAccountingPage />} />
        <Route path="genc-sinema" element={<AdminStudentCinemaPage />} />
        <Route path="genc-sinema/:id" element={<AdminStudentCinemaFormPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
