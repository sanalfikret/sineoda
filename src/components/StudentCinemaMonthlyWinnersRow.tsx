import type { ContentItem } from '../types/content'
import { FeaturedShowcaseRow } from './FeaturedShowcaseRow'

interface StudentCinemaMonthlyWinnersRowProps {
  items: ContentItem[]
  onSelect?: (item: ContentItem) => void
  guestMode?: boolean
  className?: string
}

export function StudentCinemaMonthlyWinnersRow({
  items,
  onSelect,
  guestMode = false,
  className = '',
}: StudentCinemaMonthlyWinnersRowProps) {
  return (
    <FeaturedShowcaseRow
      title="Ayın Genç Sinema Birincileri"
      items={items}
      onSelect={onSelect}
      guestMode={guestMode}
      viewAllHref={guestMode ? '/giris' : '/genc-sinema'}
      className={className}
    />
  )
}
