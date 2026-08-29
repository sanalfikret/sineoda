import type { ContentItem } from '../types/content'
import { FeaturedShowcaseRow } from './FeaturedShowcaseRow'

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
  return (
    <FeaturedShowcaseRow
      title="Ayın Genç Sinema Seçkileri"
      items={items}
      onSelect={onSelect}
      guestMode={guestMode}
      viewAllHref={guestMode ? '/giris' : '/genc-sinema'}
      className={className}
    />
  )
}
