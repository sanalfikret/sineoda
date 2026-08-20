import type { ContentType } from '../constants/contentTypes'

export type { ContentType }

export type ContentFormat = 'standard' | 'vertical'

export interface SubtitleTrack {
  lang: string
  label: string
  url: string
}

export interface ContentCredits {
  directors?: string[]
  producers?: string[]
  cast?: string[]
  studio?: string
  audioLanguages?: string[]
  subtitleLanguages?: string[]
}

export interface ContentItem {
  id: string
  title: string
  description: string
  year: number
  duration: string
  rating: string
  genres: string[]
  type: ContentType
  poster: string
  backdrop: string
  videoUrl: string
  trailerUrl?: string
  streamProvider?: string
  videoFormat?: ContentFormat
  isNew?: boolean
  newUntil?: string | null
  featured?: boolean
  subtitles?: SubtitleTrack[]
  credits?: ContentCredits
  program?: 'standard' | 'student_cinema'
  contentFormat?: 'main' | 'bts' | 'teacher_note'
}

export interface Episode {
  id: string
  contentId: string
  season: number
  episode: number
  title: string
  description: string
  duration: string
  videoUrl: string
  streamProvider?: string
  subtitles?: SubtitleTrack[]
}

export interface PlayTarget {
  item: ContentItem
  videoUrl: string
  title: string
  episodeId?: string
  startPosition?: number
  subtitles?: SubtitleTrack[]
}

export interface ContentCategory {
  id: string
  title: string
  itemIds: string[]
}

/** Yalnızca admin panelinde görünür — kullanıcıya gösterilmez */
export interface AdminContentMeta {
  contentAddedAt: string | null
  licenseExpiresAt: string | null
  licenseUnlimited: boolean
  licenseExpired: boolean
  licenseExpiringSoon: boolean
  licenseDaysRemaining: number | null
  publishedAt: string | null
  isPublished: boolean
  isScheduled: boolean
}

export type AdminContentItem = ContentItem & AdminContentMeta

export interface SearchFilters {
  query: string
  genre: string | null
  year: number | null
  type: ContentType | null
}
