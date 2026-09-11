import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchAdminChatSummary, type AdminChatSummary } from '../api/client'

const EMPTY: AdminChatSummary = { total: 0, unread: 0, read: 0, threads: 0, unreadThreads: 0 }
const POLL_MS = 30_000

interface AdminMessagesContextValue {
  summary: AdminChatSummary
  loaded: boolean
  error: string
  refresh: () => Promise<void>
}

const AdminMessagesContext = createContext<AdminMessagesContextValue | null>(null)

/** Admin panelinde okunmuş/okunmamış yapımcı mesajı sayacı — tek kaynak, tüm sayfalar aynı değeri görür. */
export function AdminMessagesProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<AdminChatSummary>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef<Promise<void> | null>(null)

  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current
    const task = fetchAdminChatSummary()
      .then((data) => {
        setSummary(data)
        setError('')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Mesaj özeti yüklenemedi.')
      })
      .finally(() => {
        setLoaded(true)
        inFlight.current = null
      })
    inFlight.current = task
    return task
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

  const value = useMemo(() => ({ summary, loaded, error, refresh }), [summary, loaded, error, refresh])
  return <AdminMessagesContext.Provider value={value}>{children}</AdminMessagesContext.Provider>
}

export function useAdminMessages() {
  const context = useContext(AdminMessagesContext)
  if (!context) throw new Error('useAdminMessages must be used within AdminMessagesProvider')
  return context
}
