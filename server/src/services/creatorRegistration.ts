import { dbGet, dbRun } from '../db.js'
import type { CreatorRow, UserRow } from '../types.js'
import { createStudentFilmSubmission } from './studentFilmSubmission.js'
import { getCreatorRegistrationPlanId } from './billingPlanDefaults.js'
import { getPlan } from './plans.js'
import { planExpiryFor } from './billingPlanDefaults.js'

/**
 * Yapımcı üyeliği aylık abonelik gibi çalışır: en az bir ödeme yapılmış VE üyelik süresi dolmamış olmalı.
 * Süre dolunca yapımcı ne izleyebilir ne film gönderebilir; yenileyince tekrar açılır.
 */
export function isCreatorRegistrationPaid(
  creator: Pick<CreatorRow, 'program' | 'registration_paid_at'>,
  user?: Pick<UserRow, 'subscription_expires_at'> | null,
) {
  if (!creator.registration_paid_at) {
    return false
  }
  if (!user?.subscription_expires_at) return false
  return new Date(user.subscription_expires_at) >= new Date()
}

export function promotePaymentPendingFilms(creatorId: string) {
  dbRun(
    `UPDATE content
     SET review_status = 'pending', review_note = NULL
     WHERE creator_id = ? AND review_status = 'payment_pending'`,
    [creatorId],
  )
}

export function creatorHasPaymentPendingFilm(creatorId: string) {
  return Boolean(
    dbGet<{ id: string }>(
      `SELECT id FROM content
       WHERE creator_id = ? AND review_status = 'payment_pending'
       LIMIT 1`,
      [creatorId],
    ),
  )
}

export function activateCreatorRegistration(userId: string, planId?: string) {
  const now = new Date().toISOString()
  const creator = dbGet<CreatorRow>('SELECT * FROM creators WHERE user_id = ?', [userId])

  dbRun(
    "UPDATE creators SET registration_paid_at = COALESCE(registration_paid_at, ?) WHERE user_id = ?",
    [now, userId],
  )

  if (creator) {
    promotePaymentPendingFilms(creator.id)

    if (
      (creator.program ?? 'standard') === 'student_cinema' &&
      creator.pending_film_link?.trim() &&
      creator.school_id &&
      !creatorHasPaymentPendingFilm(creator.id)
    ) {
      createStudentFilmSubmission({
        creatorId: creator.id,
        schoolId: creator.school_id,
        title: creator.studio_name,
        description: creator.bio ?? '',
        filmLink: creator.pending_film_link.trim(),
        now,
        reviewStatus: 'pending',
      })
    }
  }


  dbRun('UPDATE creators SET pending_film_link = NULL WHERE user_id = ?', [userId])
  const plan = getPlan(planId ?? getCreatorRegistrationPlanId(creator?.program ?? 'standard'))
  if (plan) {
    // Aktif üyelik varsa yeni dönem bitişin üstüne eklenir (izleyici aboneliğiyle aynı davranış).
    const current = dbGet<Pick<UserRow, 'subscription_status' | 'subscription_expires_at'>>(
      'SELECT subscription_status, subscription_expires_at FROM users WHERE id = ?',
      [userId],
    )
    const currentExpiry = current?.subscription_expires_at ? new Date(current.subscription_expires_at) : null
    const base =
      current && ['active', 'cancelled'].includes(current.subscription_status ?? '') && currentExpiry && currentExpiry > new Date()
        ? currentExpiry
        : new Date()
    const expiresAt = planExpiryFor({ ...plan, interval: plan.interval === 'once' ? 'month' : plan.interval }, base)
    dbRun(
      `UPDATE users
       SET subscription_status = 'active',
           subscription_plan = ?,
           subscription_started_at = COALESCE(subscription_started_at, ?),
           subscription_expires_at = ?,
           subscription_cancelled_at = NULL,
           pending_plan_id = NULL
       WHERE id = ?`,
      [plan.id, now, expiresAt, userId],
    )
  }

  return { paidAt: now }
}

export function getCreatorRegistrationStatus(userId: string) {
  const creator = dbGet<CreatorRow>(
    'SELECT program, registration_paid_at, status FROM creators WHERE user_id = ?',
    [userId],
  )
  if (!creator) return { paid: false, status: null as string | null }
  const user = dbGet<Pick<UserRow, 'subscription_expires_at'>>(
    'SELECT subscription_expires_at FROM users WHERE id = ?',
    [userId],
  )
  return {
    paid: isCreatorRegistrationPaid(creator, user),
    status: creator.status,
    paidAt: creator.registration_paid_at ?? null,
  }
}
