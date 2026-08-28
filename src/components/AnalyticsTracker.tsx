import { useSiteAnalytics } from '../hooks/useSiteAnalytics'
import { useTvMode } from '../hooks/useTvMode'

export function AnalyticsTracker() {
  useSiteAnalytics()
  useTvMode()
  return null
}
