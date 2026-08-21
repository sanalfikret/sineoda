import type { ContentItem } from '../types/content'
import { ContentRow } from './ContentRow'

interface StudentCinemaPicksRowProps {
  items: ContentItem[]
  onSelect?: (item: ContentItem) => void
  guestMode?: boolean
  className?: string
}

export function StudentCinemaPicksRow({
  items,
  onSelect,
  guestMode = false,
  className = '',
}: StudentCinemaPicksRowProps) {
  if (items.length === 0) return null

  return (
    <div className={className}>
      <ContentRow
        title="Ayın Genç Sinema Seçkileri"
        items={items}
        onSelect={onSelect ?? (() => undefined)}
        layout="portrait"
        viewAllHref={guestMode ? '/giris' : '/genc-sinema'}
        guestMode={guestMode}
      />
    </div>
  )
}
