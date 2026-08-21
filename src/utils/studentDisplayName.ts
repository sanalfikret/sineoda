import type { ContentCredits } from '../types/content'

export function getStudentDisplayName(item: {
  creatorName?: string | null
  credits?: ContentCredits
}) {
  if (item.creatorName?.trim()) return item.creatorName.trim()
  const director = item.credits?.directors?.find((name) => name.trim())
  if (director) return director.trim()
  const castMember = item.credits?.cast?.find((name) => name.trim())
  if (castMember) return castMember.trim()
  return null
}
