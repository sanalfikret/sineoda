import { dbGet, dbRun, dbTransaction } from '../db.js'
import type { CreatorRow, UserRow } from '../types.js'
import { getCreatorRegistrationStatus } from './creatorRegistration.js'
import { isValidIban, isValidTaxId, normalizeIban } from '../utils/iban.js'

const NAME_MAX = 80
const STUDIO_MAX = 120
const BIO_MAX = 1000

/** Yapımcı satırını API yanıtına çevirir (auth/me, creator/me, dashboard ortak). */
export function mapCreatorSummary(creator: CreatorRow, user?: Pick<UserRow, 'name'> | null) {
  const names = splitCreatorName(creator, user?.name ?? '')
  return {
    id: creator.id,
    studioName: creator.studio_name,
    bio: creator.bio,
    status: creator.status,
    legalAcceptedAt: creator.legal_accepted_at,
    createdAt: creator.created_at,
    program: creator.program ?? 'standard',
    schoolId: creator.school_id ?? null,
    registrationPaidAt: creator.registration_paid_at ?? null,
    registrationPaid: getCreatorRegistrationStatus(creator.user_id).paid,
    firstName: names.firstName,
    lastName: names.lastName,
    photoUrl: creator.photo_url ?? '',
    payout: {
      holder: creator.payout_holder ?? '',
      iban: creator.payout_iban ?? '',
      taxId: creator.payout_tax_id ?? '',
      taxOffice: creator.payout_tax_office ?? '',
    },
  }
}

/** Ayrı ad/soyad kaydı yoksa users.name'i son boşluktan böler. */
export function splitCreatorName(creator: Pick<CreatorRow, 'first_name' | 'last_name'>, fullName: string) {
  const first = (creator.first_name ?? '').trim()
  const last = (creator.last_name ?? '').trim()
  if (first || last) return { firstName: first, lastName: last }
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

function isAllowedPhotoUrl(value: string) {
  if (!value) return true
  if (value.startsWith('/uploads/')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export interface CreatorProfileInput {
  firstName?: unknown
  lastName?: unknown
  studioName?: unknown
  bio?: unknown
  photoUrl?: unknown
  payoutHolder?: unknown
  payoutIban?: unknown
  payoutTaxId?: unknown
  payoutTaxOffice?: unknown
}

/** Yapımcının kendi profilini günceller. Hata mesajı Türkçe döner; route 400'e çevirir. */
export function updateCreatorProfile(userId: string, input: CreatorProfileInput) {
  const creator = dbGet<CreatorRow>('SELECT * FROM creators WHERE user_id = ?', [userId])
  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!creator || !user) throw new Error('Yapımcı profili bulunamadı.')

  const current = splitCreatorName(creator, user.name)
  const firstName = String(input.firstName ?? current.firstName).trim()
  const lastName = String(input.lastName ?? current.lastName).trim()
  const studioName = String(input.studioName ?? creator.studio_name).trim()
  const bio = String(input.bio ?? creator.bio ?? '').trim()
  const photoUrl = String(input.photoUrl ?? creator.photo_url ?? '').trim()
  const payoutHolder = String(input.payoutHolder ?? creator.payout_holder ?? '').trim()
  const payoutIban = normalizeIban(input.payoutIban ?? creator.payout_iban ?? '')
  const payoutTaxId = String(input.payoutTaxId ?? creator.payout_tax_id ?? '').replace(/\s+/g, '')
  const payoutTaxOffice = String(input.payoutTaxOffice ?? creator.payout_tax_office ?? '').trim()

  if (!firstName) throw new Error('Ad zorunludur.')
  if (!lastName) throw new Error('Soyad zorunludur.')
  if (firstName.length > NAME_MAX || lastName.length > NAME_MAX) {
    throw new Error(`Ad ve soyad en fazla ${NAME_MAX} karakter olabilir.`)
  }
  if (!studioName) throw new Error('Şirket / yapım adı zorunludur.')
  if (studioName.length > STUDIO_MAX) throw new Error(`Şirket adı en fazla ${STUDIO_MAX} karakter olabilir.`)
  if (bio.length > BIO_MAX) throw new Error(`Tanıtım metni en fazla ${BIO_MAX} karakter olabilir.`)
  if (photoUrl.length > 500 || !isAllowedPhotoUrl(photoUrl)) throw new Error('Geçersiz profil fotoğrafı.')
  if (payoutIban && !isValidIban(payoutIban)) throw new Error('IBAN geçersiz. TR ile başlayan 26 karakterlik IBAN girin.')
  if (payoutIban && !payoutHolder) throw new Error('IBAN ile birlikte hesap sahibinin adı zorunludur.')
  if (payoutHolder.length > 120 || payoutTaxOffice.length > 120) throw new Error('Ödeme bilgileri en fazla 120 karakter olabilir.')
  if (!isValidTaxId(payoutTaxId)) throw new Error('Vergi numarası 10 hane, TC kimlik numarası 11 hane olmalıdır.')

  const fullName = `${firstName} ${lastName}`.trim()
  dbTransaction(() => {
    dbRun('UPDATE users SET name = ? WHERE id = ?', [fullName, userId])
    dbRun(
      'UPDATE creators SET first_name = ?, last_name = ?, studio_name = ?, bio = ?, photo_url = ?, payout_holder = ?, payout_iban = ?, payout_tax_id = ?, payout_tax_office = ? WHERE id = ?',
      [firstName, lastName, studioName, bio, photoUrl, payoutHolder, payoutIban, payoutTaxId, payoutTaxOffice, creator.id],
    )
  })

  const updatedCreator = dbGet<CreatorRow>('SELECT * FROM creators WHERE id = ?', [creator.id])!
  const updatedUser = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])!
  return { creator: updatedCreator, user: updatedUser }
}
