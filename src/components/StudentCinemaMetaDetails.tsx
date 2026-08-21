import type { ContentItem } from '../types/content'
import { getStudentDisplayName } from '../utils/studentDisplayName'

export function StudentCinemaMetaDetails({ item }: { item: ContentItem }) {
  if (item.program !== 'student_cinema') return null

  const studentName = getStudentDisplayName(item)

  if (!item.schoolName && !studentName) return null

  return (
    <>
      {item.schoolName ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-muted">Okul</p>
          <p className="mt-1 text-sm text-white/90">{item.schoolName}</p>
        </div>
      ) : null}
      {studentName ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-muted">
            Yönetmen / Öğrenci
          </p>
          <p className="mt-1 text-sm text-white/90">{studentName}</p>
        </div>
      ) : null}
    </>
  )
}
