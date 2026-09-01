import { CreatorRoute } from '../components/creator/CreatorRoute'
import { localeRoutes } from '../i18n/LocaleRoute'
import { CreatorDashboardPage } from '../pages/creator/CreatorDashboardPage'
import { CreatorLoginPage } from '../pages/creator/CreatorLoginPage'
import { CreatorPaymentPage } from '../pages/creator/CreatorPaymentPage'
import { CreatorRegisterPage } from '../pages/creator/CreatorRegisterPage'

export function creatorRoutes() {
  return [
    ...localeRoutes({ tr: '/creator/giris', en: '/en/creator/login', element: <CreatorLoginPage /> }),
    ...localeRoutes({ tr: '/creator/kayit', en: '/en/creator/register', element: <CreatorRegisterPage /> }),
    ...localeRoutes({
      tr: '/creator/odeme',
      en: '/en/creator/payment',
      element: (
        <CreatorRoute>
          <CreatorPaymentPage />
        </CreatorRoute>
      ),
    }),
    ...localeRoutes({
      tr: '/creator',
      en: '/en/creator',
      element: (
        <CreatorRoute>
          <CreatorDashboardPage />
        </CreatorRoute>
      ),
    }),
  ]
}
