import type { User } from '../types/auth'

const USER_CACHE_KEY = 'sineoda_user_cache'

export function cacheAuthUser(user: User | null) {
  if (user) {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    return
  }
  localStorage.removeItem(USER_CACHE_KEY)
}

export function readCachedAuthUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function isAuthSessionError(error: unknown) {
  const status = (error as Error & { status?: number }).status
  return status === 401
}

export function isTransientApiError(error: unknown) {
  const status = (error as Error & { status?: number }).status
  return !status || status === 408 || status === 429 || status >= 502
}

export async function sleep(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}
