import type { Profile, User } from '../types/auth'
import type { AdminContentItem, ContentCategory, ContentItem, Episode } from '../types/content'

const TOKEN_KEY = 'sineoda_token'
const PROFILE_KEY = 'sineoda_profile_id'

export function getApiBase() {
  const base = import.meta.env.VITE_API_URL ?? ''
  if (base) return base.replace(/\/$/, '')

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('.vercel.app') || host === 'sineoda.vercel.app' || host === 'sineoda.web.app') {
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
    response = await fetch(`${getApiBase()}${path}`, { ...options, headers, cache: 'no-store' })
  } catch {
    throw new Error('Sunucuya bağlanılamıyor. baslat.bat ile projeyi yeniden başlatın (API port 3001).')
  }

  if (!response.ok) {
    let message = 'İstek başarısız.'
    const contentType = response.headers.get('content-type') ?? ''
    try {
      if (contentType.includes('application/json')) {
        const body = (await response.json()) as { error?: string }
        message = body.error || message
      } else if (response.status === 404) {
        message =
          path.includes('/categories/reorder') || path.includes('/reactions/')
            ? 'API güncel değil. Render panelinde sineoda-api servisini Manual Deploy ile yeniden yayınlayın.'
            : 'Bu özellik sunucuda henüz aktif değil. API güncellenmeli.'
      } else {
        await response.text()
      }
    } catch {
      if (response.status === 502 || response.status === 503) {
        message = 'Sunucuya bağlanılamıyor. baslat.bat ile API\'nin çalıştığından emin olun.'
      } else if (response.status === 404) {
        message =
          path.includes('/categories/reorder') || path.includes('/reactions/')
            ? 'API güncel değil. Render panelinde sineoda-api servisini Manual Deploy ile yeniden yayınlayın.'
            : 'Bu özellik sunucuda henüz aktif değil. API güncellenmeli.'
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
  studentCinemaPicks?: ContentItem[]
  landing?: LandingConfigResponse
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
  sliderContentIds?: string[]
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

export async function updateAccountRequest(name: string): Promise<{ user: User }> {
  return api<{ user: User }>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export async function updateProfileRequest(
  profileId: string,
  data: { name?: string; avatar?: string; isKids?: boolean },
): Promise<{ user: User; profile: Profile }> {
  return api<{ user: User; profile: Profile }>(`/api/auth/profiles/${profileId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteProfileRequest(profileId: string): Promise<{ user: User }> {
  return api<{ user: User }>(`/api/auth/profiles/${profileId}`, {
    method: 'DELETE',
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

export async function fetchAdminCatalog(): Promise<{ catalog: AdminContentItem[] }> {
  return api<{ catalog: AdminContentItem[] }>('/api/admin/content')
}

export async function fetchExpiringLicenses(withinDays = 30): Promise<{
  items: AdminContentItem[]
  withinDays: number
}> {
  return api<{ items: AdminContentItem[]; withinDays: number }>(
    `/api/admin/content/expiring?days=${withinDays}`,
  )
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
  startedAt: string | null
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
    videoUrls?: string[]
  },
) {
  return api<{
    episodes: Episode[]
    createdCount: number
    skippedCount?: number
    startEpisode: number
    endEpisode?: number | null
  }>(`/api/episodes/content/${contentId}/bulk`, {
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

export type { JournalPost } from '../types/journal'

export async function fetchJournalPosts() {
  return api<{ posts: import('../types/journal').JournalPost[] }>('/api/journal')
}

export async function fetchJournalPost(slug: string) {
  return api<{ post: import('../types/journal').JournalPost }>(`/api/journal/${encodeURIComponent(slug)}`)
}

export async function fetchAdminJournalPosts() {
  return api<{ posts: import('../types/journal').JournalPost[] }>('/api/admin/journal')
}

export async function fetchAdminJournalPost(id: string) {
  return api<{ post: import('../types/journal').JournalPost }>(`/api/admin/journal/${id}`)
}

export async function createJournalPost(data: Record<string, unknown>) {
  return api<{ post: import('../types/journal').JournalPost }>('/api/admin/journal', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateJournalPost(id: string, data: Record<string, unknown>) {
  return api<{ post: import('../types/journal').JournalPost }>(`/api/admin/journal/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteJournalPost(id: string) {
  return api<{ ok: boolean }>(`/api/admin/journal/${id}`, { method: 'DELETE' })
}

export async function creatorLoginRequest(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>('/api/creator/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function creatorSignupRequest(data: {
  name: string
  email: string
  password: string
  studioName: string
  bio?: string
  acceptLegal: boolean
  program?: 'standard' | 'student_cinema'
  schoolId?: string
  phone?: string
  projectCrew?: string
  studentIdFileUrl?: string
}): Promise<AuthResponse> {
  return api<AuthResponse>('/api/creator/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function creatorFetchMe() {
  return api<{
    creator: {
      id: string
      studioName: string
      bio: string
      status: string
      legalAcceptedAt: string | null
      createdAt: string
    }
    documents: Array<{ id: string; docType: string; fileUrl: string; uploadedAt: string }>
  }>('/api/creator/me')
}

export async function creatorFetchDashboard() {
  return api<{
    creator: { id: string; studioName: string; status: string; documentCount: number; program?: string; schoolId?: string | null }
    payoutRules: { note: string }
    content: Array<ContentItem & { reviewStatus: string; qualifiedMinutes: number; likes: number }>
    totals: { qualifiedMinutes: number; watchMinutes: number; likes: number; viewers: number; publishedCount: number; pendingCount: number }
  }>('/api/creator/dashboard')
}

export async function creatorUploadDocument(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/creator/upload/document', {
    method: 'POST',
    body: formData,
  })
  return result.url
}

export async function creatorUploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/creator/upload/image', {
    method: 'POST',
    body: formData,
  })
  return result.url
}

export async function creatorUploadVideo(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/creator/upload/video', {
    method: 'POST',
    body: formData,
  })
  return result.url
}

export async function creatorAddDocument(docType: string, fileUrl: string) {
  return api('/api/creator/documents', {
    method: 'POST',
    body: JSON.stringify({ docType, fileUrl }),
  })
}

export async function creatorDeleteDocument(id: string) {
  return api(`/api/creator/documents/${id}`, { method: 'DELETE' })
}

export async function creatorSubmitContent(data: Record<string, unknown>) {
  return api('/api/creator/content', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export interface AdminCreator {
  id: string
  userId: string
  name: string
  email: string
  studioName: string
  bio: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  legalAcceptedAt: string | null
  createdAt: string
  documentCount: number
  contentCount: number
}

export interface AdminCreatorDocument {
  id: string
  docType: string
  fileUrl: string
  uploadedAt: string
}

export interface AdminCreatorContent extends ContentItem {
  reviewStatus: string
  qualifiedMinutes: number
  likes: number
}

export interface AdminCreatorDetail {
  creator: AdminCreator & { userCreatedAt?: string }
  documents: AdminCreatorDocument[]
  content: AdminCreatorContent[]
}

export async function fetchAdminCreators() {
  return api<{ creators: AdminCreator[] }>('/api/admin/creators/creators')
}

export async function fetchAdminCreatorDetail(id: string) {
  return api<AdminCreatorDetail>(`/api/admin/creators/creators/${id}`)
}

export async function updateAdminCreatorStatus(id: string, status: AdminCreator['status']) {
  return api<{ ok: boolean; status: string }>(`/api/admin/creators/creators/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function fetchAdminPendingCreatorContent() {
  return api<{ items: Array<ContentItem & { reviewStatus: string; studioName?: string }> }>(
    '/api/admin/creators/content/pending',
  )
}

export async function reviewAdminCreatorContent(contentId: string, reviewStatus: 'published' | 'rejected' | 'pending') {
  return api<{ item: ContentItem; reviewStatus: string }>(`/api/admin/creators/content/${contentId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ reviewStatus }),
  })
}

export interface FilmSchool {
  id: string
  name: string
  slug: string
  logoUrl: string
  website: string
}

export interface AdminFilmSchool extends FilmSchool {
  status: 'active' | 'inactive'
  createdAt: string
}

export interface AdminStudentCinemaItem extends ContentItem {
  reviewStatus: string
  program: 'standard' | 'student_cinema'
  contentFormat: 'main' | 'bts' | 'teacher_note'
  parentContentId: string | null
  schoolId: string | null
  schoolName: string | null
  schoolReviewStatus: string
  studioName: string | null
  creatorId: string | null
  creatorName?: string | null
  qualifiedMinutes?: number
  watchMinutes?: number
  likes?: number
  viewers?: number
}

export async function fetchFilmSchools() {
  return api<{ schools: FilmSchool[] }>('/api/student-cinema/schools')
}

export async function uploadStudentId(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/student-cinema/upload-student-id', {
    method: 'POST',
    body: formData,
  })
  return result.url
}

export async function fetchAdminFilmSchools() {
  return api<{ schools: AdminFilmSchool[] }>('/api/admin/student-cinema/schools')
}

export async function createAdminFilmSchool(data: { name: string; website?: string; logoUrl?: string }) {
  return api<{ school: AdminFilmSchool }>('/api/admin/student-cinema/schools', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAdminFilmSchool(
  id: string,
  data: { status?: 'active' | 'inactive'; name?: string; website?: string },
) {
  return api<{ school: AdminFilmSchool }>(`/api/admin/student-cinema/schools/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteAdminFilmSchool(id: string) {
  return api<void>(`/api/admin/student-cinema/schools/${id}`, { method: 'DELETE' })
}

export async function fetchAdminStudentCinemaQueue() {
  return api<{ items: AdminStudentCinemaItem[] }>('/api/admin/student-cinema/queue')
}

export async function fetchAdminStudentCinemaContent() {
  return api<{ items: AdminStudentCinemaItem[] }>('/api/admin/student-cinema/content')
}

export async function reviewAdminStudentCinemaSchool(
  contentId: string,
  schoolReviewStatus: 'approved' | 'rejected' | 'pending',
) {
  return api<{ item: AdminStudentCinemaItem }>(`/api/admin/student-cinema/content/${contentId}/school-review`, {
    method: 'PATCH',
    body: JSON.stringify({ schoolReviewStatus }),
  })
}

export async function reviewAdminStudentCinemaContent(
  contentId: string,
  reviewStatus: 'published' | 'rejected' | 'pending',
) {
  return api<{ item: AdminStudentCinemaItem }>(`/api/admin/student-cinema/content/${contentId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ reviewStatus }),
  })
}
