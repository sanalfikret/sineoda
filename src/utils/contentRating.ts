/** Çocuk profilinde izin verilen maksimum yaş sınırı (Genel + 7+) */
export const KIDS_PROFILE_MAX_AGE = 7

export function parseContentRatingAge(rating: string): number {
  const normalized = rating.trim().toLocaleLowerCase('tr')
  if (normalized === 'genel' || normalized === 'g' || normalized === 'all') return 0

  const match = normalized.match(/(\d+)\+/)
  if (match) return Number(match[1])

  return 13
}

/** Oynatıcı overlay ve büyük rozet için (+13, Genel vb.) */
export function formatRatingBadge(rating: string): string {
  const age = parseContentRatingAge(rating)
  if (age === 0) return 'Genel'
  return `+${age}`
}

export function getRatingDescription(rating: string): string {
  const age = parseContentRatingAge(rating)
  if (age === 0) return 'Genel izleyici kitlesi'
  return `${age} yaş ve üzeri için uygundur`
}

export function isContentAllowedForKids(rating: string): boolean {
  return parseContentRatingAge(rating) <= KIDS_PROFILE_MAX_AGE
}
