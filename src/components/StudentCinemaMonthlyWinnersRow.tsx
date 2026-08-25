import type { ContentItem } from '../types/content'
import { ContentRow } from './ContentRow'

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
  const winners = items.filter((item) => item.monthlyAward?.enabled)
  if (winners.length === 0) return null

  return (
    <div className={className}>
      <ContentRow
        title="Ayın Genç Sinema Birincileri"
        items={winners}
        onSelect={onSelect ?? (() => undefined)}
        layout="portrait"
        viewAllHref={guestMode ? '/giris' : '/genc-sinema'}
        guestMode={guestMode}
      />
    </div>
  )
}
