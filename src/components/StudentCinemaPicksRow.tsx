import type { ContentItem } from '../types/content'
import { FeaturedShowcaseRow } from './FeaturedShowcaseRow'

interface StudentCinemaPicksRowProps {
  items: ContentItem[]
  title?: string
  onSelect?: (item: ContentItem) => void
  guestMode?: boolean
  className?: string
}

export function StudentCinemaPicksRow({
  items,
  title = 'Ayın Genç Sinema Seçkileri',
  onSelect,
  guestMode = false,
  className = '',
}: StudentCinemaPicksRowProps) {
  return (
    <FeaturedShowcaseRow
      title={title}
      items={items}
      onSelect={onSelect}
      guestMode={guestMode}
      viewAllHref={guestMode ? '/giris' : '/genc-sinema'}
      className={className}
    />
  )
}
