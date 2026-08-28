import { dbGet, dbRun } from '../db.js'
import { slugify } from '../mappers.js'
import { parseContentAddedAt } from './license.js'

export function createStudentFilmSubmission(input: {
  creatorId: string
  schoolId: string
  title: string
  description: string
  filmLink: string
  now: string
}) {
  let contentId = slugify(input.title)
  let counter = 1
  while (dbGet('SELECT id FROM content WHERE id = ?', [contentId])) {
    contentId = `${slugify(input.title)}-${counter++}`
  }

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
      input.filmLink,
      input.filmLink,
      'custom',
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
      'pending',
      'student_cinema',
      'main',
      null,
      input.schoolId,
      'pending',
    ],
  )

  return contentId
}
