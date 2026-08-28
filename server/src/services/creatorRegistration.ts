import { config } from '../config.js'
import { dbGet, dbRun } from '../db.js'
import type { CreatorRow } from '../types.js'

export function isCreatorRegistrationPaid(creator: Pick<CreatorRow, 'program' | 'registration_paid_at'>) {
  if ((creator.program ?? 'standard') === 'student_cinema') return true
  if (creator.registration_paid_at) return true
  if (!config.isPaymentConfigured()) return true
  return false
}

export function activateCreatorRegistration(userId: string) {
  const now = new Date().toISOString()
  dbRun(
    "UPDATE creators SET registration_paid_at = ?, status = 'approved' WHERE user_id = ?",
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
