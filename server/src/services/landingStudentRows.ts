import { dbAll } from '../db.js'
import { mapContent } from '../mappers.js'
import { PUBLISHED_CONTENT_SQL_C } from './publish.js'
import { MAIN_CATALOG_SQL_C } from './studentCinema.js'
import { getMonthlyAwardWinnersSql } from './studentCinemaAwards.js'
import type { ContentRow } from '../types.js'

type StudentContentRow = ContentRow & { school_name: string | null; creator_name: string | null }

const contentWithMetaSql = `
  SELECT c.*, fs.name AS school_name, u.name AS creator_name
  FROM content c
  LEFT JOIN film_schools fs ON fs.id = c.school_id
  LEFT JOIN creators cr ON cr.id = c.creator_id
  LEFT JOIN users u ON u.id = cr.user_id
`

export function fetchStudentCinemaMonthlyWinnersFallback(limit = 12) {
  return dbAll<StudentContentRow>(
    `${contentWithMetaSql}
     WHERE ${PUBLISHED_CONTENT_SQL_C}
       AND c.program = 'student_cinema'
       AND ${MAIN_CATALOG_SQL_C}
       AND ${getMonthlyAwardWinnersSql()}
     ORDER BY c.monthly_award_period DESC
     LIMIT ?`,
    [limit],
  ).map(mapContent)
}

export function fetchStudentCinemaPicksFallback(limit = 12) {
  return dbAll<StudentContentRow>(
    `${contentWithMetaSql}
     WHERE ${PUBLISHED_CONTENT_SQL_C}
       AND c.program = 'student_cinema'
       AND ${MAIN_CATALOG_SQL_C}
     ORDER BY c.published_at DESC
     LIMIT ?`,
    [limit],
  ).map(mapContent)
}
