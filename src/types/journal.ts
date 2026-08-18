export type JournalPostStatus = 'draft' | 'published'

export interface JournalPost {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  coverImage: string
  author: string
  contentId: string | null
  status: JournalPostStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface JournalPostSummary extends Pick<
  JournalPost,
  'id' | 'slug' | 'title' | 'excerpt' | 'coverImage' | 'author' | 'publishedAt'
> {}
