import { Route } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import { AdminRoute } from '../components/admin/AdminRoute'
import { AdminAdsPage } from '../pages/admin/AdminAdsPage'
import { AdminBillingPlansPage } from '../pages/admin/AdminBillingPlansPage'
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage'
import { AdminCekimNotlariFormPage } from '../pages/admin/AdminCekimNotlariFormPage'
import { AdminCekimNotlariPage } from '../pages/admin/AdminCekimNotlariPage'
import { AdminContentFormPage } from '../pages/admin/AdminContentFormPage'
import { AdminContentListPage } from '../pages/admin/AdminContentListPage'
import { AdminCreatorsPage } from '../pages/admin/AdminCreatorsPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminJournalFormPage } from '../pages/admin/AdminJournalFormPage'
import { AdminJournalListPage } from '../pages/admin/AdminJournalListPage'
import { AdminLandingPage } from '../pages/admin/AdminLandingPage'
import { AdminLegalPage } from '../pages/admin/AdminLegalPage'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { AdminSiteModePage } from '../pages/admin/AdminSiteModePage'
import { AdminStudentCinemaFormPage } from '../pages/admin/AdminStudentCinemaFormPage'
import { AdminStudentCinemaPage } from '../pages/admin/AdminStudentCinemaPage'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { AdminWatchAccountingPage } from '../pages/admin/AdminWatchAccountingPage'

export function adminRoutes() {
  return (
    <>
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
    </>
  )
}
