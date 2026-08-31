import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchSiteMode, type SiteModeConfig } from '../api/client'
import { useAuth } from './AuthContext'

interface SiteModeContextValue {
  siteMode: SiteModeConfig | null
  loading: boolean
  refreshSiteMode: () => Promise<void>
  isComingSoon: boolean
  canBypassComingSoon: boolean
}

const SiteModeContext = createContext<SiteModeContextValue | null>(null)

export function SiteModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [siteMode, setSiteMode] = useState<SiteModeConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSiteMode = useCallback(async () => {
    try {
      const mode = await fetchSiteMode()
      setSiteMode(mode)
    } catch {
      setSiteMode(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSiteMode()
  }, [refreshSiteMode])

  const canBypassComingSoon = user?.role === 'admin' || user?.role === 'manager'
  const isComingSoon = Boolean(siteMode?.enabled) && !canBypassComingSoon

  const value = useMemo(
    () => ({
      siteMode,
      loading,
      refreshSiteMode,
      isComingSoon,
      canBypassComingSoon,
    }),
    [siteMode, loading, refreshSiteMode, isComingSoon, canBypassComingSoon],
  )

  return <SiteModeContext.Provider value={value}>{children}</SiteModeContext.Provider>
}

export function useSiteMode() {
  const ctx = useContext(SiteModeContext)
  if (!ctx) throw new Error('useSiteMode SiteModeProvider içinde kullanılmalı')
  return ctx
}
