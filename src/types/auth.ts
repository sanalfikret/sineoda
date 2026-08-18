export interface Profile {
  id: string
  name: string
  avatar: string
  isKids?: boolean
}

export type UserRole = 'user' | 'admin'

export interface Subscription {
  status: string
  plan: string | null
  expiresAt: string | null
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  profiles: Profile[]
  subscription?: Subscription
}

export interface Session {
  userId: string
  profileId: string | null
}

export interface StoredUser extends User {
  password: string
}

export const PROFILE_AVATARS = ['🎬', '🍿', '🌟', '🎭', '🚀', '🎵', '📺', '🎪'] as const
