import type { ContentType } from './constants/contentTypes.js'

export type UserRole = 'user' | 'admin' | 'creator'
export type CreatorStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ContentReviewStatus = 'draft' | 'pending' | 'published' | 'rejected'
export type CreatorProgram = 'standard' | 'student_cinema'
export type ContentProgram = 'standard' | 'student_cinema' | 'shooting_notes'
export type StudentContentFormat = 'main' | 'bts' | 'teacher_note'
export type SchoolReviewStatus = 'none' | 'pending' | 'approved' | 'rejected'
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
  subscription_started_at?: string | null
  pending_plan_id?: string | null
  student_id_url?: string | null
  phone?: string | null
  phone_verified?: number
  email_verified?: number
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
  duration_minutes?: number | null
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
  festivals_json?: string
  content_added_at?: string | null
  license_expires_at?: string | null
  published_at?: string | null
  source_video_url?: string | null
  creator_id?: string | null
  review_status?: ContentReviewStatus
  program?: ContentProgram
  content_format?: StudentContentFormat
  parent_content_id?: string | null
  school_id?: string | null
  school_review_status?: SchoolReviewStatus
  monthly_award_enabled?: number | null
  monthly_award_period?: string | null
  monthly_award_badge?: string | null
  monthly_award_prize?: string | null
  application_declaration_json?: string | null
}

export interface CreatorRow {
  id: string
  user_id: string
  studio_name: string
  bio: string
  status: CreatorStatus
  legal_accepted_at: string | null
  created_at: string
  program?: CreatorProgram
  school_id?: string | null
  project_crew?: string
  registration_paid_at?: string | null
  pending_film_link?: string | null
}

export interface FilmSchoolRow {
  id: string
  name: string
  slug: string
  logo_url: string
  website: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface CreatorDocumentRow {
  id: string
  creator_id: string
  doc_type: string
  file_url: string
  uploaded_at: string
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
