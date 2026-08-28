export interface Profile {
  id: string
  name: string
  avatar: string
  isKids?: boolean
}

export type UserRole = 'user' | 'admin' | 'manager' | 'creator'

export type CreatorStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface CreatorProfile {
  id: string
  studioName: string
  bio: string
  status: CreatorStatus
  legalAcceptedAt: string | null
  createdAt: string
  program?: 'standard' | 'student_cinema'
  schoolId?: string | null
}

export interface Subscription {
  status: string
  plan: string | null
  startedAt?: string | null
  expiresAt: string | null
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  profiles: Profile[]
  phone?: string | null
  phoneVerified?: boolean
  emailVerified?: boolean
  createdAt?: string
  subscription?: Subscription
  pendingPlanId?: string | null
  studentIdUrl?: string | null
  creator?: CreatorProfile | null
}

export interface Session {
  userId: string
  profileId: string | null
}

export interface StoredUser extends User {
  password: string
}

export const PROFILE_AVATARS = ['🎬', '🍿', '🌟', '🎭', '🚀', '🎵', '📺', '🎪'] as const
