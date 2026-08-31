import { config } from '../config.js'
import { dbGet, dbRun } from '../db.js'
import type { CreatorRow } from '../types.js'
import { createStudentFilmSubmission } from './studentFilmSubmission.js'

export function isCreatorRegistrationPaid(
  creator: Pick<CreatorRow, 'program' | 'registration_paid_at'>,
) {
  if (creator.registration_paid_at) return true
  if (!config.isPaymentConfigured()) return !config.isProduction
  return false
}

export function activateCreatorRegistration(userId: string) {
  const now = new Date().toISOString()
  const creator = dbGet<CreatorRow>('SELECT * FROM creators WHERE user_id = ?', [userId])

  if (
    creator &&
    (creator.program ?? 'standard') === 'student_cinema' &&
    creator.pending_film_link?.trim() &&
    creator.school_id
  ) {
    createStudentFilmSubmission({
      creatorId: creator.id,
      schoolId: creator.school_id,
      title: creator.studio_name,
      description: creator.bio ?? '',
      filmLink: creator.pending_film_link.trim(),
      now,
    })
  }

  dbRun(
    "UPDATE creators SET registration_paid_at = ?, status = 'approved', pending_film_link = NULL WHERE user_id = ?",
    [now, userId],
  )
  return { paidAt: now }
}

export function getCreatorRegistrationStatus(userId: string) {
  const creator = dbGet<CreatorRow>(
    'SELECT program, registration_paid_at, status FROM creators WHERE user_id = ?',
    [userId],
  )
  if (!creator) return { paid: false, status: null as string | null }
  return {
    paid: isCreatorRegistrationPaid(creator),
    status: creator.status,
    paidAt: creator.registration_paid_at ?? null,
  }
}
