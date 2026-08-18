import type { Profile, User } from '../types/auth'
import type { ContentCategory, ContentItem, Episode } from '../types/content'

const TOKEN_KEY = 'sineoda_token'
const PROFILE_KEY = 'sineoda_profile_id'

export function getApiBase() {
  const base = import.meta.env.VITE_API_URL ?? ''
  if (base) return base.replace(/\/$/, '')

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('.vercel.app') || host === 'sineoda.vercel.app') {
      return 'https://sineoda-api.onrender.com'
    }
  }

  return ''
}

export function resolveMediaUrl(url: string) {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const base = getApiBase()
  if (!base) return url

  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getProfileId() {
  return localStorage.getItem(PROFILE_KEY)
}

export function setProfileId(profileId: string | null) {
  if (profileId) localStorage.setItem(PROFILE_KEY, profileId)
  else localStorage.removeItem(PROFILE_KEY)
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const profileId = getProfileId()
  if (profileId) headers.set('X-Profile-Id', profileId)

  let response: Response
  try {
    response = await fetch(`${getApiBase()}${path}`, { ...options, headers })
  } catch {
    throw new Error('Sunucuya bağlanılamıyor. baslat.bat ile projeyi yeniden başlatın (API port 3001).')
  }

  if (!response.ok) {
    let message = 'İstek başarısız.'
    try {
      const body = (await response.json()) as { error?: string }
      message = body.error || message
    } catch {
      if (response.status === 502 || response.status === 503) {
        message = 'Sunucuya bağlanılamıyor. baslat.bat ile API\'nin çalıştığından emin olun.'
      }
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/admin/upload/image', {
    method: 'POST',
    body: formData,
  })
  return result.url
}

export async function uploadVideo(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/admin/upload/video', {
    method: 'POST',
    body: formData,
  })
  return result.url
}

export async function uploadSubtitle(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/admin/upload/subtitle', {
    method: 'POST',
    body: formData,
  })
  return result.url
}

export interface AuthResponse {
  token: string
  user: User
}

export interface BootstrapResponse {
  catalog: ContentItem[]
  categories: ContentCategory[]
  featuredContent: ContentItem | null
  trailers: ContentItem[]
  newReleases: ContentItem[]
}

export interface LandingShowcaseResponse {
  id: string
  title: string
  icon: string
  description: string
  items: ContentItem[]
}

export interface LandingConfigResponse {
  slider: ContentItem[]
  showcases: LandingShowcaseResponse[]
}

export async function loginRequest(
  email: string,
  password: string,
  requireAdmin = false,
): Promise<AuthResponse> {
  return api<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, requireAdmin }),
  })
}

export async function sendSmsCode(phone: string): Promise<{
  message: string
  expiresInSeconds: number
  devCode?: string
}> {
  return api('/api/auth/sms/send', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
}

export async function signupRequest(
  name: string,
  email: string,
  password: string,
  phone: string,
  smsCode: string,
): Promise<AuthResponse> {
  return api<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone, smsCode }),
  })
}

export async function forgotPasswordRequest(email: string): Promise<{
  message: string
  devResetUrl?: string
}> {
  return api('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPasswordRequest(token: string, password: string): Promise<{ message: string }> {
  return api('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export async function fetchMe(): Promise<{ user: User }> {
  return api<{ user: User }>('/api/auth/me')
}

export async function createProfileRequest(
  name: string,
  avatar: string,
  isKids = false,
): Promise<{ user: User; profile: Profile }> {
  return api<{ user: User; profile: Profile }>('/api/auth/profiles', {
    method: 'POST',
    body: JSON.stringify({ name, avatar, isKids }),
  })
}

export async function fetchBootstrap(): Promise<BootstrapResponse> {
  return api<BootstrapResponse>('/api/bootstrap')
}

export async function fetchLandingConfig(): Promise<LandingConfigResponse> {
  return api<LandingConfigResponse>('/api/landing')
}

export async function updateLandingConfig(payload: {
  sliderIds: string[]
  showcases: Array<{
    id: string
    title: string
    icon: string
    description: string
    itemIds: string[]
  }>
}): Promise<LandingConfigResponse> {
  return api<LandingConfigResponse>('/api/admin/landing', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function submitContactForm(payload: {
  name: string
  email: string
  subject: string
  message: string
}): Promise<{ message: string }> {
  return api<{ message: string }>('/api/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchWatchlist(): Promise<{ items: ContentItem[] }> {
  return api<{ items: ContentItem[] }>('/api/watchlist')
}

export async function addToWatchlist(contentId: string) {
  return api('/api/watchlist/' + contentId, { method: 'POST' })
}

export async function removeFromWatchlist(contentId: string) {
  return api('/api/watchlist/' + contentId, { method: 'DELETE' })
}

export interface AdminUser extends User {
  createdAt: string
}

export async function fetchAdminUsers(): Promise<{ users: AdminUser[] }> {
  return api<{ users: AdminUser[] }>('/api/admin/users')
}

export async function createAdminUser(data: {
  name: string
  email: string
  password: string
  role: 'user' | 'admin'
}) {
  return api<{ user: AdminUser }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAdminUser(
  id: string,
  data: Partial<{ name: string; email: string; password: string; role: 'user' | 'admin' }>,
) {
  return api<{ user: AdminUser }>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteAdminUser(id: string) {
  return api(`/api/admin/users/${id}`, { method: 'DELETE' })
}

export interface BillingPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
}

export interface BillingProviders {
  paytr: boolean
  iyzico: boolean
  default: 'paytr' | 'iyzico'
  paymentRequired: boolean
}

export async function fetchBillingPlans(): Promise<{
  plans: BillingPlan[]
  providers: BillingProviders
}> {
  return api('/api/billing/plans')
}

export type CheckoutResult =
  | { provider: 'paytr'; token: string; iframeUrl: string }
  | { provider: 'iyzico'; paymentPageUrl: string; token?: string }
  | { demoMode: true; message: string; expiresAt: string }

export async function startCheckout(
  planId: string,
  provider: 'paytr' | 'iyzico',
): Promise<CheckoutResult & { message?: string }> {
  return api('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId, provider }),
  })
}

export async function fetchSubscription(): Promise<{
  status: string
  plan: string | null
  expiresAt: string | null
  canPlay: boolean
  paymentRequired: boolean
}> {
  return api('/api/billing/subscription')
}

export async function fetchCanPlay(): Promise<{ allowed: boolean; paymentRequired: boolean }> {
  return api('/api/billing/can-play')
}

export async function fetchEpisodes(contentId: string) {
  return api<{ episodes: import('../types/content').Episode[] }>(`/api/episodes/content/${contentId}`)
}

export async function createEpisode(
  contentId: string,
  data: Partial<import('../types/content').Episode>,
) {
  return api<{ episode: import('../types/content').Episode }>(`/api/episodes/content/${contentId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateEpisode(id: string, data: Partial<import('../types/content').Episode>) {
  return api<{ episode: import('../types/content').Episode }>(`/api/episodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteEpisode(id: string) {
  return api(`/api/episodes/${id}`, { method: 'DELETE' })
}

export async function bulkCreateEpisodes(
  contentId: string,
  data: {
    season?: number
    count?: number
    titlePrefix?: string
    duration?: string
    startEpisode?: number
    titles?: string[]
  },
) {
  return api<{ episodes: Episode[]; createdCount: number }>(`/api/episodes/content/${contentId}/bulk`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchReaction(contentId: string) {
  return api<{ reaction: 'like' | 'dislike' | null }>(`/api/reactions/${contentId}`)
}

export async function setReaction(contentId: string, reaction: 'like' | 'dislike' | null) {
  return api<{ reaction: 'like' | 'dislike' | null }>(`/api/reactions/${contentId}`, {
    method: 'PUT',
    body: JSON.stringify({ reaction }),
  })
}

export async function fetchWatchProgress(contentId: string, episodeId?: string) {
  const query = episodeId
    ? `?contentId=${encodeURIComponent(contentId)}&episodeId=${encodeURIComponent(episodeId)}`
    : `?contentId=${encodeURIComponent(contentId)}`
  return api<{
    progress: { position: number; duration: number; totalWatched: number; updatedAt: string } | null
  }>(`/api/watch-progress${query}`)
}

export async function saveWatchProgress(data: {
  contentId: string
  episodeId?: string
  position: number
  duration: number
}) {
  return api<{ ok: boolean; totalWatched: number }>('/api/watch-progress', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchAllWatchProgress() {
  return api<{
    items: Array<{
      contentId: string
      episodeId: string | null
      position: number
      duration: number
      totalWatched: number
    }>
  }>('/api/watch-progress/all')
}

export interface WatchStat {
  contentId: string
  title: string
  type: string
  totalWatchedMinutes: number
  viewerCount: number
  avgProgressPercent: number
}

export async function fetchWatchStats() {
  return api<{ stats: WatchStat[] }>('/api/admin/analytics/watch-stats')
}

export interface AnalyticsOverview {
  today: {
    visits: number
    uniqueVisitors: number
    watchMinutes: number
    watchHours: number
  }
  live: {
    onlineNow: number
  }
  totals: {
    users: number
    activeSubscriptions: number
    watchMinutes: number
    watchHours: number
  }
}

export async function fetchAnalyticsOverview() {
  return api<AnalyticsOverview>('/api/admin/analytics/overview')
}

export async function recordSiteVisit(sessionId: string) {
  return api('/api/analytics/visit', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export async function sendPresenceHeartbeat(sessionId: string, profileId?: string) {
  return api('/api/analytics/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ sessionId, profileId }),
  })
}
