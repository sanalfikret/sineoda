import { useEffect } from 'react'
import { getProfileId, recordSiteVisit, sendPresenceHeartbeat } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getSessionId } from '../utils/sessionId'

export function useSiteAnalytics() {
  const { user } = useAuth()

  useEffect(() => {
    const sessionId = getSessionId()
    void recordSiteVisit(sessionId).catch(() => undefined)

    const ping = () => {
      void sendPresenceHeartbeat(sessionId, getProfileId() ?? undefined).catch(() => undefined)
    }

    ping()
    const interval = window.setInterval(ping, 45_000)
    return () => window.clearInterval(interval)
  }, [user?.id])
}
