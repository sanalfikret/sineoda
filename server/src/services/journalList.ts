import { dbAll } from '../db.js'
import { mapJournalPost } from '../mappers.js'
import { getLandingSectionsConfig } from './landingSections.js'
import { journalPinOrderMap, loadJournalPinIds } from './journalPins.js'
import { JOURNAL_PUBLISHED_SQL } from './publish.js'
import type { JournalPostRow } from '../types.js'

export const JOURNAL_PAGE_SIZE = 12

function publishedClause() {
  return JOURNAL_PUBLISHED_SQL
}

function compareByDate(a: JournalPostRow, b: JournalPostRow) {
  const aDate = a.published_at ?? a.created_at
  const bDate = b.published_at ?? b.created_at
  return bDate.localeCompare(aDate)
}

export function listPublishedJournalPostsOrdered() {
  const pinIds = loadJournalPinIds()
  const pinOrder = journalPinOrderMap(pinIds)
  const rows = dbAll<JournalPostRow>(
    `SELECT * FROM journal_posts WHERE ${publishedClause()}`,
  )

  const pinned = pinIds
    .map((id) => rows.find((row) => row.id === id))
    .filter((row): row is JournalPostRow => Boolean(row))

  const unpinned = rows
    .filter((row) => !pinOrder.has(row.id))
    .sort(compareByDate)

  return [...pinned, ...unpinned].map(mapJournalPost)
}

export function listPublishedJournalPostsPage(page: number, pageSize = JOURNAL_PAGE_SIZE) {
  const ordered = listPublishedJournalPostsOrdered()
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : JOURNAL_PAGE_SIZE
  const total = ordered.length
  const totalPages = Math.max(1, Math.ceil(total / safeSize))
  const currentPage = Math.min(safePage, totalPages)
  const offset = (currentPage - 1) * safeSize

  return {
    posts: ordered.slice(offset, offset + safeSize),
    total,
    page: currentPage,
    pageSize: safeSize,
    totalPages,
    section: getLandingSectionsConfig().journal,
  }
}
