import { useSiteAnalytics } from '../hooks/useSiteAnalytics'
import { useTvBrowseNav } from '../hooks/useTvBrowseNav'
import { useTvMode } from '../hooks/useTvMode'

export function AnalyticsTracker() {
  useSiteAnalytics()
  useTvMode()
  useTvBrowseNav()
  return null
}
