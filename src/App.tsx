import { type ReactNode, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { NavRouteGuard } from './components/NavRouteGuard'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminRoute } from './components/admin/AdminRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SearchProvider } from './context/SearchContext'
import { WatchlistProvider } from './context/WatchlistContext'
import { useAuth } from './context/AuthContext'
import { useLocale } from './i18n/LocaleContext'
import { getEffectiveLocale } from './i18n/localePreference'
import { localizePathname } from './i18n/paths'
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
  const { localizePath } = useLocale()
  const contentId = searchParams.get('icerik')

  useEffect(() => {
    if (contentId) {
      navigate(localizePath(`/icerik/${contentId}`), { replace: true })
    }
  }, [contentId, localizePath, navigate])

  return null
}

function CatchAllRedirect() {
  const { localizePath } = useLocale()
  return <Navigate to={localizePath('/')} replace />
}

/** Bare EN slugs without /en prefix (bookmarks, old links). */
function LegacyLocaleRedirect({ trPath }: { trPath: string }) {
  const locale = getEffectiveLocale()
  return <Navigate to={localizePathname(trPath, locale)} replace />
}

function HomeRoute() {
  const { user, activeProfile, isLoading, isCreator } = useAuth()
  const { loading: siteModeLoading, siteMode, canBypassComingSoon } = useSiteMode()
  const { localizePath } = useLocale()

  if (isLoading || siteModeLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (siteMode?.enabled && !canBypassComingSoon) {
    if (user && isCreator) {
      return <Navigate to={localizePath('/creator')} replace />
    }
    return <ComingSoonPage />
  }

  if (user && isCreator) {
    return <Navigate to={localizePath('/creator')} replace />
  }

  if (user && needsSubscriptionPayment(user)) {
    return <Navigate to={localizePath(postLoginPath(user))} replace />
  }

  if (user && activeProfile) {
    return (
      <AuthenticatedProviders>
        <BrowsePage />
      </AuthenticatedProviders>
    )
  }

  if (user && !activeProfile) {
    return <Navigate to={localizePath('/profiller')} replace />
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
      {localeRoutes({ tr: '/', en: '/en', element: <HomeRoute /> })}
      {localeRoutes({ tr: '/tanitim', en: '/en/about', element: <TanitimRoute /> })}
      {localeRoutes({ tr: '/giris', en: '/en/login', element: <SiteModeGuard><LoginPage /></SiteModeGuard> })}
      {localeRoutes({ tr: '/kayit', en: '/en/signup', element: <SiteModeGuard mode="signup"><SignupPage /></SiteModeGuard> })}
      {localeRoutes({ tr: '/eposta-dogrula', en: '/en/verify-email', element: <VerifyEmailPage /> })}
      {localeRoutes({ tr: '/sifremi-unuttum', en: '/en/forgot-password', element: <ForgotPasswordPage /> })}
      {localeRoutes({ tr: '/sifre-sifirla', en: '/en/reset-password', element: <ResetPasswordPage /> })}
      {localeRoutes({ tr: '/planlar', en: '/en/plans', element: <SiteModeGuard mode="signup"><PricingPage /></SiteModeGuard> })}
      {localeRoutes({ tr: '/yasal/:slug', en: '/en/legal/:slug', element: <LegalPage /> })}
      {localeRoutes({ tr: '/iletisim', en: '/en/contact', element: <ContactPage /> })}
      {localeRoutes({
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
      })}
      {localeRoutes({ tr: '/odeme/paytr', en: '/en/payment/paytr', element: <PaytrCheckoutPage /> })}
      {localeRoutes({ tr: '/odeme/basarili', en: '/en/payment/success', element: <PaymentSuccessPage /> })}
      {localeRoutes({ tr: '/odeme/basarisiz', en: '/en/payment/failed', element: <PaymentFailPage /> })}
      {localeRoutes({
        tr: '/hesap',
        en: '/en/account',
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        ),
      })}
      {localeRoutes({
        tr: '/profiller',
        en: '/en/profiles',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireSubscription>
              <ProfilesPage />
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}
      {localeRoutes({
        tr: '/mesajlar',
        en: '/en/messages',
        element: (
          <ProtectedRoute>
            <AuthenticatedProviders>
              <MessagesPage />
            </AuthenticatedProviders>
          </ProtectedRoute>
        ),
      })}
      {localeRoutes({
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
      })}
      {localeRoutes({
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
      })}
      {localeRoutes({
        tr: '/diziler',
        en: '/en/series',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard contentType="dizi">
                  <BrowsePage contentType="dizi" pageTitle="Diziler" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}
      {localeRoutes({
        tr: '/filmler',
        en: '/en/films',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard contentType="film">
                  <BrowsePage contentType="film" pageTitle="Filmler" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}
      {localeRoutes({
        tr: '/belgeseller',
        en: '/en/documentaries',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard contentType="belgesel">
                  <BrowsePage contentType="belgesel" pageTitle="Belgeseller" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}
      {localeRoutes({
        tr: '/stand-up',
        en: '/en/stand-up',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard contentType="stand-up">
                  <BrowsePage contentType="stand-up" pageTitle="Stand-up" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}
      {localeRoutes({
        tr: '/klasikler',
        en: '/en/classics',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard classicsOnly>
                  <BrowsePage classicsOnly pageTitle="Klasikler" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}
      {localeRoutes({
        tr: '/dikey-diziler',
        en: '/en/vertical-series',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard verticalOnly>
                  <BrowsePage verticalOnly pageTitle="Dikey Diziler" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}
      {localeRoutes({
        tr: '/genc-sinema',
        en: '/en/student-cinema',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard studentCinemaOnly>
                  <BrowsePage studentCinemaOnly pageTitle="Genç Sinema" />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}
      {localeRoutes({
        tr: '/cekim-notlari',
        en: '/en/production-notes',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <NavRouteGuard cekimNotlariOnly>
                  <CekimNotlariPage />
                </NavRouteGuard>
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}
      {localeRoutes({
        tr: '/kisa-filmler',
        en: '/en/short-films',
        element: (
          <SiteModeGuard>
            <ProtectedRoute requireProfile requireSubscription>
              <AuthenticatedProviders>
                <BrowsePage contentType="kisa-film" pageTitle="Kısa Filmler" />
              </AuthenticatedProviders>
            </ProtectedRoute>
          </SiteModeGuard>
        ),
      })}

      <Route path="/admin/giris" element={<AdminLoginPage />} />
      {localeRoutes({ tr: '/creator/giris', en: '/en/creator/login', element: <CreatorLoginPage /> })}
      {localeRoutes({ tr: '/creator/kayit', en: '/en/creator/register', element: <CreatorRegisterPage /> })}
      {localeRoutes({
        tr: '/creator/odeme',
        en: '/en/creator/payment',
        element: (
          <CreatorRoute>
            <CreatorPaymentPage />
          </CreatorRoute>
        ),
      })}
      {localeRoutes({
        tr: '/creator',
        en: '/en/creator',
        element: (
          <CreatorRoute>
            <CreatorDashboardPage />
          </CreatorRoute>
        ),
      })}
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

      <Route path="/login" element={<LegacyLocaleRedirect trPath="/giris" />} />
      <Route path="/signup" element={<LegacyLocaleRedirect trPath="/kayit" />} />
      <Route path="/plans" element={<LegacyLocaleRedirect trPath="/planlar" />} />
      <Route path="/journal" element={<LegacyLocaleRedirect trPath="/dergi" />} />

      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
    </>
  )
}

export default App
