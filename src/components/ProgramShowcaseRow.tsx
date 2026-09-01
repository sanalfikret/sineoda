import type { ContentItem } from '../types/content'
import { PROGRAM_SHOWCASE_ROWS } from '../../shared/catalog/programRows'
import { FeaturedShowcaseRow } from './FeaturedShowcaseRow'

export type ProgramShowcaseKind = keyof typeof PROGRAM_SHOWCASE_ROWS

interface ProgramShowcaseRowProps {
  kind: ProgramShowcaseKind
  items: ContentItem[]
  title?: string
  onSelect?: (item: ContentItem) => void
  guestMode?: boolean
  className?: string
}

/** Genç Sinema vitrin satırları — tek bileşen, catalog'dan başlık/yol. */
export function ProgramShowcaseRow({
  kind,
  items,
  title,
  onSelect,
  guestMode = false,
  className = '',
}: ProgramShowcaseRowProps) {
  const config = PROGRAM_SHOWCASE_ROWS[kind]
  return (
    <FeaturedShowcaseRow
      title={title ?? config.title}
      items={items}
      onSelect={onSelect}
      guestMode={guestMode}
      viewAllHref={config.viewAllPath}
      className={className}
    />
  )
}

// Backward-compatible aliases
export function StudentCinemaPicksRow(props: Omit<ProgramShowcaseRowProps, 'kind'>) {
  return <ProgramShowcaseRow kind="studentPicks" {...props} />
}

export function StudentCinemaMonthlyWinnersRow(props: Omit<ProgramShowcaseRowProps, 'kind'>) {
  return <ProgramShowcaseRow kind="studentMonthlyWinners" {...props} />
}
