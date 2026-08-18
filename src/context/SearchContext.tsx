import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface SearchContextValue {
  isOpen: boolean
  openSearch: () => void
  closeSearch: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openSearch = useCallback(() => setIsOpen(true), [])
  const closeSearch = useCallback(() => setIsOpen(false), [])

  const value = useMemo(
    () => ({ isOpen, openSearch, closeSearch }),
    [isOpen, openSearch, closeSearch],
  )

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearchUI() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearchUI must be used within SearchProvider')
  }
  return context
}
