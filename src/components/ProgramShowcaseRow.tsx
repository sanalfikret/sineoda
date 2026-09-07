import { useContent } from '../context/ContentContext'
import type { ContentItem } from '../types/content'
import { PROGRAM_SHOWCASE_ROWS } from '../../shared/catalog/programRows'
import { ContentRow } from './ContentRow'

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
}: ProgramShowcaseRowProps) {
  const { categories } = useContent()
  const config = PROGRAM_SHOWCASE_ROWS[kind]
  if (kind === 'studentMonthlyWinners' && categories.some(row => row.id === 'student-monthly-winners' && row.hidden)) return null
  return (
    <ContentRow
      title={title ?? config.title}
      items={items}
      onSelect={onSelect ?? (() => undefined)}
      guestMode={guestMode}
      viewAllHref={kind === 'studentMonthlyWinners' ? '/?kategori=student-monthly-winners' : '/?kategori=student-picks'}

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
