import { externalMediaLink } from './creatorMedia.js'
import { dbGet, dbRun } from '../db.js'
import { slugify } from '../mappers.js'
import { parseContentAddedAt } from './license.js'
import { inferStreamProvider } from './streamProvider.js'
import type { ContentRow } from '../types.js'

function isEmptyCreditsJson(value: string | null | undefined) {
  const trimmed = (value ?? '').trim()
  return !trimmed || trimmed === '{}' || trimmed === 'null'
}

/** Ödeme sonrası otomatik oluşturulan, henüz tam başvuru yapılmamış Genç Sinema ana filmi. */
export function findStudentMainStub(creatorId: string) {
  const row = dbGet<ContentRow>(
    `SELECT * FROM content
     WHERE creator_id = ?
       AND program = 'student_cinema'
       AND content_format = 'main'
       AND review_status IN ('pending', 'payment_pending', 'rejected')
     ORDER BY content_added_at ASC
     LIMIT 1`,
    [creatorId],
  )
  if (!row || !isEmptyCreditsJson(row.credits_json)) return null
  return row
}

export function createStudentFilmSubmission(input: {
  creatorId: string
  schoolId: string
  title: string
  description: string
  filmLink: string
  now: string
  reviewStatus?: 'pending' | 'payment_pending'
}) {
  const creator = dbGet<{ registration_paid_at: string | null; student_application_type: string }>('SELECT registration_paid_at, student_application_type FROM creators WHERE id = ?', [input.creatorId])
  if (!creator?.registration_paid_at) throw new Error('CREATOR_PAYMENT_REQUIRED')
  const reviewStatus = 'pending'
  const existing = findStudentMainStub(input.creatorId)
  if (existing) return existing.id

  const existingMain = dbGet<{ id: string }>(
    `SELECT id FROM content
     WHERE creator_id = ? AND program = 'student_cinema' AND content_format = 'main'
     LIMIT 1`,
    [input.creatorId],
  )
  if (existingMain) return existingMain.id

  let contentId = slugify(input.title)
  let counter = 1
  while (dbGet('SELECT id FROM content WHERE id = ?', [contentId])) {
    contentId = `${slugify(input.title)}-${counter++}`
  }

  const filmLink = externalMediaLink(input.filmLink, true)
  const streamProvider = inferStreamProvider(filmLink)

  dbRun(
    `INSERT INTO content (
      id, title, description, year, duration, rating, type, genres, poster, backdrop,
      video_url, source_video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured,
      subtitles_json, credits_json, content_added_at, license_expires_at, published_at,
      creator_id, review_status, program, content_format, parent_content_id, school_id, school_review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contentId,
      input.title,
      input.description,
      new Date().getFullYear(),
      '',
      '13+',
      'film',
      '[]',
      '',
      '',
      '',
      filmLink,
      streamProvider,
      '',
      'standard',
      0,
      null,
      0,
      '[]',
      '{}',
      parseContentAddedAt(input.now),
      null,
      null,
      input.creatorId,
      reviewStatus,
      'student_cinema',
      'main',
      null,
      input.schoolId,
      creator.student_application_type === 'individual' ? 'none' : 'pending',
    ],
  )

  return contentId
}
