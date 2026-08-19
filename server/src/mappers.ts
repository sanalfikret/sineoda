import { resolveContentImages } from './services/contentImages.js'
import { parseCredits } from './services/credits.js'
import {
  getLicenseDaysRemaining,
  isLicenseExpired,
  isLicenseExpiringSoon,
  isLicenseUnlimited,
} from './services/license.js'
import { isContentPublished, isContentScheduled } from './services/publish.js'
import type { ContentRow, EpisodeRow, ProfileRow, UserRow } from './types.js'

export interface SubtitleTrack {
  lang: string
  label: string
  url: string
}

function parseSubtitles(value?: string | null): SubtitleTrack[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as SubtitleTrack[]
    return Array.isArray(parsed) ? parsed.filter((track) => track?.url && track?.lang) : []
  } catch {
    return []
  }
}

export function serializeSubtitles(subtitles: SubtitleTrack[] | unknown) {
  if (!Array.isArray(subtitles)) return '[]'
  const cleaned = subtitles
    .filter((track): track is SubtitleTrack => Boolean(track && typeof track === 'object' && 'url' in track && 'lang' in track))
    .map((track) => ({
      lang: String(track.lang),
      label: String(track.label || track.lang),
      url: String(track.url),
    }))
    .filter((track) => track.url.trim())
  return JSON.stringify(cleaned)
}

export function mapUser(row: UserRow, profiles: ProfileRow[] = []) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profiles: profiles.map(mapProfile),
    createdAt: row.created_at,
    subscription: {
      status: row.subscription_status ?? 'free',
      plan: row.subscription_plan ?? null,
      expiresAt: row.subscription_expires_at ?? null,
    },
  }
}

export function mapProfile(row: ProfileRow) {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    isKids: Boolean(row.is_kids),
  }
}

export function mapContentLicense(row: ContentRow) {
  const licenseExpiresAt = row.license_expires_at ?? null
  const contentAddedAt = row.content_added_at ?? null
  const publishedAt = row.published_at ?? null
  return {
    contentAddedAt,
    licenseExpiresAt,
    licenseUnlimited: isLicenseUnlimited(licenseExpiresAt),
    licenseExpired: isLicenseExpired(licenseExpiresAt),
    licenseExpiringSoon: isLicenseExpiringSoon(licenseExpiresAt),
    licenseDaysRemaining: licenseExpiresAt ? getLicenseDaysRemaining(licenseExpiresAt) : null,
    publishedAt,
    isPublished: isContentPublished(publishedAt),
    isScheduled: isContentScheduled(publishedAt),
  }
}

export function mapContentAdmin(row: ContentRow) {
  return {
    ...mapContent(row),
    ...mapContentLicense(row),
  }
}

export function mapContent(row: ContentRow) {
  const newUntil = row.new_until ?? null
  const isNewFlag = Boolean(row.is_new) || (newUntil ? new Date(newUntil) > new Date() : false)
  const images = resolveContentImages(row)
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    year: row.year,
    duration: row.duration,
    rating: row.rating,
    type: row.type,
    genres: JSON.parse(row.genres) as string[],
    poster: images.poster,
    backdrop: images.backdrop,
    videoUrl: row.video_url,
    trailerUrl: row.trailer_url ?? '',
    streamProvider: row.stream_provider ?? 'custom',
    videoFormat: (row.video_format ?? 'standard') as 'standard' | 'vertical',
    isNew: isNewFlag,
    newUntil,
    featured: Boolean(row.featured),
    subtitles: parseSubtitles(row.subtitles_json),
    credits: parseCredits(row.credits_json),
  }
}

export function mapEpisode(row: EpisodeRow) {
  return {
    id: row.id,
    contentId: row.content_id,
    season: row.season,
    episode: row.episode_number,
    title: row.title,
    description: row.description,
    duration: row.duration,
    videoUrl: row.video_url,
    streamProvider: row.stream_provider ?? 'custom',
    subtitles: parseSubtitles(row.subtitles_json),
  }
}

export function slugify(text: string) {
  return text
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function mapJournalPost(row: import('./types.js').JournalPostRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    coverImage: row.cover_image,
    author: row.author,
    contentId: row.content_id,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
