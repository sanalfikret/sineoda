export type ContentType = 'film' | 'dizi'

export type ContentFormat = 'standard' | 'vertical'

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
}

export interface PlayTarget {
  item: ContentItem
  videoUrl: string
  title: string
  episodeId?: string
  startPosition?: number
}

export interface ContentCategory {
  id: string
  title: string
  itemIds: string[]
}

export interface SearchFilters {
  query: string
  genre: string | null
  year: number | null
  type: ContentType | null
}
