import type { ContentRow, EpisodeRow, ProfileRow, UserRow } from './types.js'

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

export function mapContent(row: ContentRow) {
  const newUntil = row.new_until ?? null
  const isNewFlag = Boolean(row.is_new) || (newUntil ? new Date(newUntil) > new Date() : false)
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    year: row.year,
    duration: row.duration,
    rating: row.rating,
    type: row.type,
    genres: JSON.parse(row.genres) as string[],
    poster: row.poster,
    backdrop: row.backdrop,
    videoUrl: row.video_url,
    trailerUrl: row.trailer_url ?? '',
    streamProvider: row.stream_provider ?? 'custom',
    videoFormat: (row.video_format ?? 'standard') as 'standard' | 'vertical',
    isNew: isNewFlag,
    newUntil,
    featured: Boolean(row.featured),
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
