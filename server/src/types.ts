import type { ContentType } from './constants/contentTypes.js'

export type UserRole = 'user' | 'admin'
export type { ContentType }

export interface UserRow {
  id: string
  name: string
  email: string
  password_hash: string
  role: UserRole
  created_at: string
  subscription_status?: string
  subscription_plan?: string | null
  subscription_expires_at?: string | null
}

export interface ProfileRow {
  id: string
  user_id: string
  name: string
  avatar: string
  is_kids: number
}

export interface ContentRow {
  id: string
  title: string
  description: string
  year: number
  duration: string
  rating: string
  type: ContentType
  genres: string
  poster: string
  backdrop: string
  video_url: string
  stream_provider?: string
  featured: number
  trailer_url?: string
  video_format?: string
  is_new?: number
  new_until?: string | null
  subtitles_json?: string
  credits_json?: string
  content_added_at?: string | null
  license_expires_at?: string | null
  published_at?: string | null
}

export interface EpisodeRow {
  id: string
  content_id: string
  season: number
  episode_number: number
  title: string
  description: string
  duration: string
  video_url: string
  stream_provider?: string
  sort_order: number
  subtitles_json?: string
}

export interface CategoryRow {
  id: string
  title: string
  sort_order: number
}

export interface JournalPostRow {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  cover_image: string
  author: string
  content_id: string | null
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface JwtPayload {
  userId: string
  role: UserRole
}
