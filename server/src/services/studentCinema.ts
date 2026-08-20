import { dbAll, dbGet, dbRun } from '../db.js'
import { PUBLISHED_CONTENT_SQL } from './publish.js'
import type { ContentRow } from '../types.js'

export const GENC_SINEMA_CATEGORY_ID = 'genc-sinema'

export const MAIN_CATALOG_SQL = `COALESCE(content_format, 'main') = 'main'`

export const STANDARD_PROGRAM_SQL = `COALESCE(program, 'standard') != 'student_cinema'`

export function isStudentMainRow(row: Pick<ContentRow, 'program' | 'content_format'>) {
  return (row.program ?? 'standard') === 'student_cinema' && (row.content_format ?? 'main') === 'main'
}

export function addToGencSinemaCategory(contentId: string) {
  dbRun('DELETE FROM category_items WHERE content_id = ? AND category_id != ?', [
    contentId,
    GENC_SINEMA_CATEGORY_ID,
  ])

  const existing = dbGet('SELECT category_id FROM category_items WHERE category_id = ? AND content_id = ?', [
    GENC_SINEMA_CATEGORY_ID,
    contentId,
  ])
  if (existing) return

  const maxOrder = dbGet<{ max_order: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM category_items WHERE category_id = ?',
    [GENC_SINEMA_CATEGORY_ID],
  )

  dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
    GENC_SINEMA_CATEGORY_ID,
    contentId,
    (maxOrder?.max_order ?? -1) + 1,
  ])
}

export function removeStudentFromOtherCategories(contentId: string) {
  dbRun('DELETE FROM category_items WHERE content_id = ? AND category_id != ?', [
    contentId,
    GENC_SINEMA_CATEGORY_ID,
  ])
}

export interface ContentEngagementStats {
  qualifiedMinutes: number
  watchMinutes: number
  likes: number
  viewers: number
}

export function getContentEngagementStats(contentIds: string[]) {
  if (contentIds.length === 0) return new Map<string, ContentEngagementStats>()

  const placeholders = contentIds.map(() => '?').join(',')
  const rows = dbAll<{
    content_id: string
    qualified_seconds: number
    watch_seconds: number
    likes: number
    viewers: number
  }>(
    `SELECT
      c.id AS content_id,
      COALESCE(SUM(cqa.seconds_watched), 0) AS qualified_seconds,
      COALESCE((
        SELECT SUM(wp.total_watched_seconds)
        FROM watch_progress wp
        WHERE wp.content_id = c.id
      ), 0) AS watch_seconds,
      COALESCE((
        SELECT COUNT(*)
        FROM content_reactions cr
        WHERE cr.content_id = c.id AND cr.reaction = 'like'
      ), 0) AS likes,
      COALESCE((
        SELECT COUNT(DISTINCT wp.profile_id)
        FROM watch_progress wp
        WHERE wp.content_id = c.id AND wp.total_watched_seconds > 0
      ), 0) AS viewers
    FROM content c
    LEFT JOIN creator_qualified_activity cqa ON cqa.content_id = c.id
    WHERE c.id IN (${placeholders})
    GROUP BY c.id`,
    contentIds,
  )

  return new Map(
    rows.map((row) => [
      row.content_id,
      {
        qualifiedMinutes: Math.round(row.qualified_seconds / 60),
        watchMinutes: Math.round(row.watch_seconds / 60),
        likes: row.likes,
        viewers: row.viewers,
      },
    ]),
  )
}

export function attachStats<T extends { id: string }>(
  items: T[],
  stats: Map<string, ContentEngagementStats>,
) {
  return items.map((item) => ({
    ...item,
    ...(stats.get(item.id) ?? {
      qualifiedMinutes: 0,
      watchMinutes: 0,
      likes: 0,
      viewers: 0,
    }),
  }))
}

export function ensureStudentCinemaCatalog() {
  const publishedStudentMain = dbAll<ContentRow>(
    `SELECT * FROM content
     WHERE ${PUBLISHED_CONTENT_SQL}
       AND program = 'student_cinema'
       AND ${MAIN_CATALOG_SQL}`,
  )

  for (const row of publishedStudentMain) {
    addToGencSinemaCategory(row.id)
  }

  const misplaced = dbAll<{ content_id: string }>(
    `SELECT ci.content_id
     FROM category_items ci
     JOIN content c ON c.id = ci.content_id
     WHERE c.program = 'student_cinema'
       AND ci.category_id != ?`,
    [GENC_SINEMA_CATEGORY_ID],
  )

  for (const row of misplaced) {
    removeStudentFromOtherCategories(row.content_id)
  }
}

export function isCatalogEligibleRow(row: ContentRow) {
  return (row.content_format ?? 'main') === 'main'
}
