/** Virtual / program browse rows — ids and TR titles (EN via i18n categories.*). */

export const STUDENT_CINEMA_ROW_ID = 'genc-sinema' as const
export const STUDENT_MONTHLY_WINNERS_ROW_ID = 'student-monthly-winners' as const
export const STUDENT_MONTHLY_WINNERS_ROW_TITLE = 'Ayın Genç Sinema Birincileri' as const
export const STUDENT_PICKS_ROW_TITLE = 'Ayın Genç Sinema Seçkileri' as const
export const VERTICAL_SERIES_ROW_ID = 'dikey-diziler' as const
export const CLASSICS_BROWSE_ROW_ID = 'classics' as const

export const PROGRAM_SHOWCASE_ROWS = {
  studentPicks: {
    title: STUDENT_PICKS_ROW_TITLE,
    viewAllPath: '/genc-sinema',
  },
  studentMonthlyWinners: {
    id: STUDENT_MONTHLY_WINNERS_ROW_ID,
    title: STUDENT_MONTHLY_WINNERS_ROW_TITLE,
    viewAllPath: '/genc-sinema',
  },
} as const

export const FEATURED_SHOWCASE_ROW_IDS = new Set<string>([STUDENT_MONTHLY_WINNERS_ROW_ID])

export function isFeaturedShowcaseRowId(rowId: string) {
  return FEATURED_SHOWCASE_ROW_IDS.has(rowId)
}

export function isMonthlyEditorialRowTitle(title: string) {
  return /^Ayın /i.test(title.trim())
}
