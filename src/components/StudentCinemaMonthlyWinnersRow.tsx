import type { ContentItem } from '../types/content'
import { FeaturedShowcaseRow } from './FeaturedShowcaseRow'

interface StudentCinemaMonthlyWinnersRowProps {
  items: ContentItem[]
  title?: string
  onSelect?: (item: ContentItem) => void
  guestMode?: boolean
  className?: string
}

export function StudentCinemaMonthlyWinnersRow({
  items,
  title = 'Ayın Genç Sinema Birincileri',
  onSelect,
  guestMode = false,
  className = '',
}: StudentCinemaMonthlyWinnersRowProps) {
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
