import type { ContentItem } from '../types/content'
import { getStudentDisplayName } from '../utils/studentDisplayName'
import { formatAwardPeriod } from '../utils/studentCinemaAward'

export function StudentCinemaMetaDetails({ item }: { item: ContentItem }) {
  if (item.program !== 'student_cinema') return null

  const studentName = getStudentDisplayName(item)
  const award = item.monthlyAward?.enabled ? item.monthlyAward : null

  if (!item.schoolName && !studentName && !award) return null

  return (
    <>
      {award ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">
            {award.badge ?? 'Ayın Birincisi'}
          </p>
          {award.period ? (
            <p className="mt-0.5 text-xs text-emerald-100/70">{formatAwardPeriod(award.period)} dönemi</p>
          ) : null}
          {award.prize ? <p className="mt-1 text-sm font-medium text-emerald-200">{award.prize}</p> : null}
        </div>
      ) : null}
      {item.schoolName ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-plooy-muted">Okul</p>
          <p className="mt-1 text-sm text-white/90">{item.schoolName}</p>
        </div>
      ) : null}
      {studentName ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-plooy-muted">
            Yönetmen / Öğrenci
          </p>
          <p className="mt-1 text-sm text-white/90">{studentName}</p>
        </div>
      ) : null}
    </>
  )
}
