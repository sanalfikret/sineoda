import { v4 as uuid } from 'uuid'
import {
  buildConsentText,
  CONSENT_DOCUMENTS,
  LEGAL_VERSION,
  type ConsentType,
} from '../constants/legal.js'
import { dbAll, dbGet, dbRun } from '../db.js'

export interface LegalConsentRow {
  id: string
  user_id: string | null
  session_id: string | null
  consent_type: ConsentType
  document_slug: string
  document_version: string
  user_name: string
  user_email: string | null
  ip_address: string
  user_agent: string | null
  consent_text: string
  accepted_at: string
}

export interface LegalConsentRecord {
  id: string
  consentType: ConsentType
  documentSlug: string
  documentVersion: string
  userName: string
  userEmail: string | null
  ipAddress: string
  acceptedAt: string
  consentText: string
}

function mapConsent(row: LegalConsentRow): LegalConsentRecord {
  return {
    id: row.id,
    consentType: row.consent_type,
    documentSlug: row.document_slug,
    documentVersion: row.document_version,
    userName: row.user_name,
    userEmail: row.user_email,
    ipAddress: row.ip_address,
    acceptedAt: row.accepted_at,
    consentText: row.consent_text,
  }
}

function documentMeta(type: ConsentType) {
  if (type === 'cookies') {
    return { slug: 'cerez-politikasi', title: 'Çerez Politikası' }
  }
  if (type === 'creator_terms') {
    return { slug: 'yapimci-sozlesmesi', title: 'Yapımcı Sözleşmesi' }
  }
  return CONSENT_DOCUMENTS[type]
}

export function recordLegalConsent(input: {
  userId?: string | null
  sessionId?: string | null
  type: ConsentType
  userName: string
  userEmail?: string | null
  ipAddress: string
  userAgent?: string | null
  acceptedAt?: string
  cookieChoice?: 'accepted' | 'essential-only'
}) {
  const acceptedAt = input.acceptedAt ?? new Date().toISOString()
  const meta = documentMeta(input.type)
  let consentText = buildConsentText({
    type: input.type,
    userName: input.userName,
    userEmail: input.userEmail,
    ipAddress: input.ipAddress,
    acceptedAt,
  })

  if (input.type === 'cookies' && input.cookieChoice === 'essential-only') {
    consentText += '\n\nTercih: Yalnızca zorunlu çerezler.'
  } else if (input.type === 'cookies' && input.cookieChoice === 'accepted') {
    consentText += '\n\nTercih: Tüm çerezler (analitik dahil) kabul edildi.'
  }

  const id = uuid()
  dbRun(
    `INSERT INTO legal_consents (
      id, user_id, session_id, consent_type, document_slug, document_version,
      user_name, user_email, ip_address, user_agent, consent_text, accepted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId ?? null,
      input.sessionId ?? null,
      input.type,
      meta.slug,
      LEGAL_VERSION,
      input.userName.trim(),
      input.userEmail?.trim().toLowerCase() ?? null,
      input.ipAddress,
      input.userAgent ?? null,
      consentText,
      acceptedAt,
    ],
  )

  return mapConsent(
    dbGet<LegalConsentRow>('SELECT * FROM legal_consents WHERE id = ?', [id])!,
  )
}

export function recordSignupConsents(input: {
  userId: string
  userName: string
  userEmail: string
  ipAddress: string
  userAgent?: string | null
  acceptTerms: boolean
  acceptPrivacy: boolean
  acceptKvkk: boolean
}) {
  if (!input.acceptTerms || !input.acceptPrivacy || !input.acceptKvkk) {
    throw new Error('Kullanım Koşulları, Gizlilik Politikası ve KVKK onayı zorunludur.')
  }

  const base = {
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  }

  return [
    recordLegalConsent({ ...base, type: 'terms' }),
    recordLegalConsent({ ...base, type: 'privacy' }),
    recordLegalConsent({ ...base, type: 'kvkk' }),
  ]
}

export function listUserLegalConsents(userId: string) {
  const rows = dbAll<LegalConsentRow>(
    'SELECT * FROM legal_consents WHERE user_id = ? ORDER BY accepted_at DESC',
    [userId],
  )
  return rows.map(mapConsent)
}

export interface UserKvkkSummary {
  accepted: boolean
  consentId: string | null
  acceptedAt: string | null
  ipAddress: string | null
  userName: string | null
  consentText: string | null
}

export function getKvkkSummariesByUserIds(userIds: string[]): Record<string, UserKvkkSummary> {
  if (userIds.length === 0) return {}

  const placeholders = userIds.map(() => '?').join(', ')
  const rows = dbAll<LegalConsentRow>(
    `SELECT * FROM legal_consents
     WHERE user_id IN (${placeholders}) AND consent_type = 'kvkk'
     ORDER BY accepted_at DESC`,
    userIds,
  )

  const summaries: Record<string, UserKvkkSummary> = {}
  for (const userId of userIds) {
    summaries[userId] = {
      accepted: false,
      consentId: null,
      acceptedAt: null,
      ipAddress: null,
      userName: null,
      consentText: null,
    }
  }

  for (const row of rows) {
    if (!row.user_id || summaries[row.user_id]?.accepted) continue
    summaries[row.user_id] = {
      accepted: true,
      consentId: row.id,
      acceptedAt: row.accepted_at,
      ipAddress: row.ip_address,
      userName: row.user_name,
      consentText: row.consent_text,
    }
  }

  return summaries
}
