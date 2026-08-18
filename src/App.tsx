import { type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
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
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { BrowsePage } from './pages/BrowsePage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { MyListPage } from './pages/MyListPage'
import { PricingPage } from './pages/PricingPage'
import { PaytrCheckoutPage } from './pages/PaytrCheckoutPage'
import { PaymentSuccessPage } from './pages/PaymentSuccessPage'
import { PaymentFailPage } from './pages/PaymentFailPage'
import { ProfilesPage } from './pages/ProfilesPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LegalPage } from './pages/LegalPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SignupPage } from './pages/SignupPage'

function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return (
    <WatchlistProvider>
      <SearchProvider>{children}</SearchProvider>
    </WatchlistProvider>
  )
}

function HomeRoute() {
  const { user, activeProfile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sineoda-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
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

  return <LandingPage />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/giris" element={<LoginPage />} />
      <Route path="/kayit" element={<SignupPage />} />
      <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
      <Route path="/sifre-sifirla" element={<ResetPasswordPage />} />
      <Route path="/planlar" element={<PricingPage />} />
      <Route path="/yasal/:slug" element={<LegalPage />} />
      <Route path="/odeme/paytr" element={<PaytrCheckoutPage />} />
      <Route path="/odeme/basarili" element={<PaymentSuccessPage />} />
      <Route path="/odeme/basarisiz" element={<PaymentFailPage />} />
      <Route
        path="/profiller"
        element={
          <ProtectedRoute>
            <ProfilesPage />
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
        <Route path="kullanicilar" element={<AdminUsersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
