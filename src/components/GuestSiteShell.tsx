import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchProvider } from '../context/SearchContext'
import { useLocale } from '../i18n/LocaleContext'
import type { ContentItem } from '../types/content'
import { Header } from './Header'
import { SearchModal } from './SearchModal'

interface GuestSiteShellProps {
  children: ReactNode
  footer?: ReactNode
  /** Sabit header altında içerik — planlar, iletişim vb. */
  offsetHeader?: boolean
}

/** Misafir sayfaları (ana sayfa, dergi): tek Header + arama — menü tutarlılığı. */
export function GuestSiteShell({ children, footer, offsetHeader = false }: GuestSiteShellProps) {
  const navigate = useNavigate()
  const { localizePath } = useLocale()

  const openContentFromSearch = (item: ContentItem) => {
    navigate(localizePath(`/icerik/${item.id}`))
  }

  return (
    <SearchProvider>
      <Header />
      <div className={offsetHeader ? 'header-offset' : undefined}>{children}</div>
      <SearchModal onSelect={openContentFromSearch} />
      {footer}
    </SearchProvider>
  )
}
