import type { LegalDocument, LegalSlug } from '../constants/legal'
import type { Profile, User } from '../types/auth'
import type { AdCampaign, AdCampaignFormInput, AdPlayback } from '../types/ads'
import { NAV_CATEGORY_SYNC, SITE_NAV_IDS, SITE_NAV_ITEMS, type SiteNavConfig, type SiteNavId } from '../constants/siteNav'
import { deriveHiddenNavFromCategories } from '../utils/navVisibility'
import type { AdminContentItem, AdminContentMeta, ContentCategory, ContentItem, Episode } from '../types/content'
import type { LandingSectionsConfig } from '../constants/landingDefaults'
import type { LandingCustomBlock } from '../constants/landingCustomBlocks'
import { isAuthSessionError, isTransientApiError, sleep } from '../utils/authSession'

export type { LandingSectionsConfig } from '../constants/landingDefaults'

const TOKEN_KEY = 'plooy_token'
const LEGACY_TOKEN_KEY = 'sineoda_token'
const PROFILE_KEY = 'plooy_profile_id'
const LEGACY_PROFILE_KEY = 'sineoda_profile_id'
const AUTH_TOKEN_HEADER = 'X-Plooy-Token'
const LEGACY_AUTH_TOKEN_HEADER = 'X-Sineoda-Token'

/**
 * API kökü — production VPS: aynı origin (/api).
 * Yapılandırma: config/env.example + config/AYARLAR.txt
 * Sunucunun index.html'e enjekte ettiği __PLOOY_API_BASE__ önceliklidir.
 */
export function getApiBase() {
  if (typeof window !== 'undefined') {
    type ApiWindow = Window & {
      __PLOOY_API_BASE__?: string
      __SINEODA_API_BASE__?: string
    }
    const w = window as ApiWindow
    const runtime = w.__PLOOY_API_BASE__ ?? w.__SINEODA_API_BASE__
    if (runtime !== undefined) {
      return runtime.replace(/\/$/, '')
    }
    const configured = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
    if (configured) return configured
    return ''
  }

  return String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
}

function readStorageItem(key: string, legacyKey: string) {
  return localStorage.getItem(key) ?? localStorage.getItem(legacyKey)
}

function writeStorageItem(key: string, legacyKey: string, value: string | null) {
  if (value) {
    localStorage.setItem(key, value)
    localStorage.removeItem(legacyKey)
    return
  }
  localStorage.removeItem(key)
  localStorage.removeItem(legacyKey)
}

function readAuthTokenHeader(response: Response) {
  return response.headers.get(AUTH_TOKEN_HEADER) ?? response.headers.get(LEGACY_AUTH_TOKEN_HEADER)
}

/** DB'ye kaydedilecek yol — domain yok, sunucu taşınsa da çalışır (/uploads/...). */
export function normalizeStoredMediaPath(url: string) {
  const trimmed = String(url ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const match = trimmed.match(/\/uploads\/[^\s?#]+/i)
    if (match) return match[0]
    return trimmed
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function resolveMediaUrl(url: string) {
  if (!url) return url
  url = normalizeStoredMediaPath(url)

  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const base = getApiBase()
  if (!base) return url

  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export function getToken() {
  return readStorageItem(TOKEN_KEY, LEGACY_TOKEN_KEY)
}

export function setToken(token: string | null) {
  writeStorageItem(TOKEN_KEY, LEGACY_TOKEN_KEY, token)
}

export function getProfileId() {
  return readStorageItem(PROFILE_KEY, LEGACY_PROFILE_KEY)
}

export function setProfileId(profileId: string | null) {
  writeStorageItem(PROFILE_KEY, LEGACY_PROFILE_KEY, profileId)
}

export async function refreshSessionToken() {
  const token = getToken()
  if (!token) return false

  try {
    const headers = new Headers({ Authorization: `Bearer ${token}` })
    const profileId = getProfileId()
    if (profileId) headers.set('X-Profile-Id', profileId)

    let response = await fetch(`${getApiBase()}/api/auth/refresh`, {
      method: 'POST',
      headers,
      cache: 'no-store',
    })

    if (response.status === 404) {
      response = await fetch(`${getApiBase()}/api/auth/me`, { headers, cache: 'no-store' })
    }

    if (!response.ok) return false

    const headerToken = readAuthTokenHeader(response)
    if (headerToken) {
      setToken(headerToken)
      return true
    }

    const body = (await response.json()) as { token?: string }
    if (body.token) {
      setToken(body.token)
      return true
    }
  } catch {
    return false
  }

  return false
}

export async function api<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
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

  if (
    response.status === 401 &&
    !retried &&
    path !== '/api/auth/refresh' &&
    path !== '/api/auth/login'
  ) {
    const refreshed = await refreshSessionToken()
    if (refreshed) return api<T>(path, options, true)
  }

  if (!response.ok) {
    let message = 'İstek başarısız.'
    const contentType = response.headers.get('content-type') ?? ''
    try {
      if (contentType.includes('application/json')) {
        const body = (await response.json()) as { error?: string; code?: string; email?: string }
        message = body.error || message
        const err = new Error(message) as Error & { code?: string; email?: string; status?: number }
        err.code = body.code
        err.email = body.email
        err.status = response.status
        throw err
      } else if (response.status === 404) {
        message =
          path.includes('/categories/reorder') || path.includes('/reactions/')
            ? 'API güncel değil. VPS\'te bash deploy/rebuild-vps.sh çalıştırın.'
            : 'Bu özellik sunucuda henüz aktif değil. API güncellenmeli.'
      } else {
        await response.text()
      }
    } catch (parseError) {
      if (parseError instanceof Error && 'status' in parseError) {
        throw parseError
      }
      if (response.status === 502 || response.status === 503) {
        message = 'Sunucuya bağlanılamıyor. baslat.bat ile API\'nin çalıştığından emin olun.'
      } else if (response.status === 404) {
        message =
          path.includes('/categories/reorder') || path.includes('/reactions/')
            ? 'API güncel değil. VPS\'te bash deploy/rebuild-vps.sh çalıştırın.'
            : 'Bu özellik sunucuda henüz aktif değil. API güncellenmeli.'
      }
    }
    const err = new Error(message) as Error & { status?: number }
    err.status = response.status
    throw err
  }

  if (response.status === 204) {
    const refreshed = readAuthTokenHeader(response)
    if (refreshed) setToken(refreshed)
    return undefined as T
  }

  const data = (await response.json()) as T & { token?: string }
  const refreshed = readAuthTokenHeader(response) ?? data.token
  if (refreshed) setToken(refreshed)
  return data as T
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/admin/upload/image', {
    method: 'POST',
    body: formData,
  })
  return normalizeStoredMediaPath(result.url)
}

export async function uploadProfileAvatar(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/auth/upload/avatar', {
    method: 'POST',
    body: formData,
  })
  return normalizeStoredMediaPath(result.url)
}

export interface ProfileWatchStats {
  totalSeconds: number
  totalTitles: number
  byCategory: Array<{
    key: string
    label: string
    totalSeconds: number
    titlesWatched: number
  }>
}

export async function fetchProfileWatchStats(profileId: string) {
  return api<ProfileWatchStats>(`/api/watch-progress/stats?profileId=${encodeURIComponent(profileId)}`)
}

export async function uploadVideo(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/admin/upload/video', {
    method: 'POST',
    body: formData,
  })
  return normalizeStoredMediaPath(result.url)
}

export async function uploadSubtitle(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/admin/upload/subtitle', {
    method: 'POST',
    body: formData,
  })
  return normalizeStoredMediaPath(result.url)
}

export interface AuthResponse {
  token: string
  user: User
}

export interface BootstrapResponse {
  catalog: ContentItem[]
  categories: ContentCategory[]
  categoryOrder?: string[]
  featuredContent: ContentItem | null
  trailers: ContentItem[]
  newReleases: ContentItem[]
  studentCinemaPicks?: ContentItem[]
  studentCinemaCatalog?: ContentItem[]
  studentCinemaMonthlyWinners?: ContentItem[]
  siteNav?: SiteNavConfig
  landing?: LandingConfigResponse
  cekimNotlari?: CekimNotlariPayload
}

export interface LandingShowcaseResponse {
  id: string
  title: string
  icon: string
  description: string
  items: ContentItem[]
}

export interface LandingHeroConfig {
  line1: string
  line2: string
  description: string
  ctaPrimary: string
  ctaPrimaryLink: string
  ctaSecondary: string
  ctaSecondaryLink: string
  legalNote: string
  backgroundImage: string
  backgroundVideo: string
  backgroundContentId: string | null
  featuredContentId: string | null
  showFeaturedCard: boolean
}

export interface LandingLayoutConfig {
  order: string[]
  hidden: string[]
}

export interface LandingConfigResponse {
  slider: ContentItem[]
  sliderContentIds?: string[]
  showcases: LandingShowcaseResponse[]
  hero?: LandingHeroConfig
  featuredItem?: ContentItem | null
  sections?: LandingSectionsConfig
  layout?: LandingLayoutConfig
  customBlocks?: LandingCustomBlock[]
  monthlyWinnerContentIds?: string[]
  monthlyWinners?: ContentItem[]
  studentPickContentIds?: string[]
  studentPicks?: ContentItem[]
  blockTitles?: Partial<Record<string, string>>
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
  options?: {
    planId?: string
    studentIdUrl?: string
    acceptTerms?: boolean
    acceptPrivacy?: boolean
    acceptKvkk?: boolean
  },
): Promise<{ message: string; email: string; planId?: string; devVerifyUrl?: string }> {
  return api('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      password,
      phone,
      smsCode,
      planId: options?.planId,
      studentIdUrl: options?.studentIdUrl,
      acceptTerms: options?.acceptTerms,
      acceptPrivacy: options?.acceptPrivacy,
      acceptKvkk: options?.acceptKvkk,
    }),
  })
}

export async function verifyEmailRequest(token: string): Promise<{ message: string }> {
  return api('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function resendVerificationRequest(email: string): Promise<{
  message: string
  devVerifyUrl?: string
}> {
  return api('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
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

export async function fetchMe(): Promise<{ user: User; token?: string }> {
  return api<{ user: User; token?: string }>('/api/auth/me')
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

export async function changePasswordRequest(currentPassword: string, newPassword: string) {
  return api<{ ok: boolean }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function changeEmailRequest(newEmail: string, password: string) {
  return api<{ message: string; devConfirmUrl?: string }>('/api/auth/change-email', {
    method: 'POST',
    body: JSON.stringify({ newEmail, password }),
  })
}

export async function confirmEmailChangeRequest(token: string) {
  return api<{ message: string }>('/api/auth/confirm-email-change', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function openBillingInvoiceReceipt(invoiceId: string) {
  const token = getToken()
  const res = await fetch(`${getApiBase()}/api/billing/invoices/${encodeURIComponent(invoiceId)}/receipt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    throw new Error('Makbuz açılamadı.')
  }
  const html = await res.text()
  const popup = window.open('', '_blank', 'noopener,noreferrer')
  if (!popup) {
    throw new Error('Açılır pencere engellendi.')
  }
  popup.document.write(html)
  popup.document.close()
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

export async function updateAdminSiteNav(hidden: SiteNavId[]) {
  try {
    return await api<{ siteNav: SiteNavConfig; categories: ContentCategory[] }>('/api/admin/site-nav', {
      method: 'PATCH',
      body: JSON.stringify({ hidden }),
    })
  } catch (error) {
    const status = (error as Error & { status?: number }).status
    if (status !== 404) throw error

    const hiddenSet = new Set(hidden)
    for (const navId of SITE_NAV_IDS) {
      if (navId === 'home') continue
      const categoryIds = NAV_CATEGORY_SYNC[navId]
      if (categoryIds.length === 0) continue
      const shouldHide = hiddenSet.has(navId)
      for (const categoryId of categoryIds) {
        await api(`/api/categories/${categoryId}`, {
          method: 'PATCH',
          body: JSON.stringify({ hidden: shouldHide }),
        })
      }
    }

    const { categories } = await api<{ categories: ContentCategory[] }>('/api/categories')
    const derivedHidden = deriveHiddenNavFromCategories(categories)

    return {
      siteNav: {
        hidden: derivedHidden,
        items: SITE_NAV_ITEMS.map((item) => ({
          ...item,
          hidden: derivedHidden.includes(item.id),
        })),
      },
      categories,
    }
  }
}

export async function fetchLandingConfig(): Promise<LandingConfigResponse> {
  return api<LandingConfigResponse>(`/api/landing?_=${Date.now()}`)
}

export async function updateLandingHeroConfig(
  hero: LandingHeroConfig,
): Promise<{ hero: LandingHeroConfig }> {
  return api<{ hero: LandingHeroConfig }>('/api/admin/landing/hero', {
    method: 'PATCH',
    body: JSON.stringify(hero),
  })
}

export async function updateLandingSectionsConfig(
  sections: LandingSectionsConfig,
): Promise<{ sections: LandingSectionsConfig }> {
  return api('/api/admin/landing/sections', {
    method: 'PATCH',
    body: JSON.stringify(sections),
  })
}

export async function updateLandingLayoutConfig(
  layout: LandingLayoutConfig,
): Promise<{ layout: LandingLayoutConfig }> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await api<{ layout: LandingLayoutConfig }>('/api/admin/landing/layout', {
        method: 'PATCH',
        body: JSON.stringify(layout),
      })
    } catch (error) {
      lastError = error
      if (isAuthSessionError(error) && attempt < 2) {
        const refreshed = await refreshSessionToken()
        if (refreshed) continue
      }
      if (!isTransientApiError(error) || attempt === 2) throw error
      await sleep(900 * (attempt + 1))
    }
  }
  throw lastError
}

export async function saveLandingPageConfig(payload: {
  hero: LandingHeroConfig
  sections: LandingSectionsConfig
  layout: LandingLayoutConfig
  sliderIds: string[]
  showcases: Array<{
    id: string
    title: string
    icon: string
    description: string
    itemIds: string[]
  }>
  customBlocks?: LandingCustomBlock[]
  monthlyWinnerIds?: string[]
  studentPickIds?: string[]
  blockTitles?: Partial<Record<string, string>>
}): Promise<LandingConfigResponse> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await api<LandingConfigResponse>('/api/admin/landing', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    } catch (error) {
      lastError = error
      if (isAuthSessionError(error) && attempt < 2) {
        const refreshed = await refreshSessionToken()
        if (refreshed) continue
      }
      if (!isTransientApiError(error) || attempt === 2) throw error
      await sleep(900 * (attempt + 1))
    }
  }
  throw lastError
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

export interface AdminKvkkConsent {
  accepted: boolean
  consentId: string | null
  acceptedAt: string | null
  ipAddress: string | null
  userName: string | null
  consentText: string | null
}

export interface AdminUser extends User {
  createdAt: string
  kvkkConsent?: AdminKvkkConsent | null
}

export async function fetchAdminUsers(): Promise<{ users: AdminUser[] }> {
  return api<{ users: AdminUser[] }>('/api/admin/users')
}

export async function createAdminUser(data: {
  name: string
  email: string
  password: string
  role: 'user' | 'admin' | 'manager'
}) {
  return api<{ user: AdminUser }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAdminUser(
  id: string,
  data: Partial<{ name: string; email: string; password: string; role: 'user' | 'admin' | 'manager' }>,
) {
  return api<{ user: AdminUser }>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function giftAdminUserSubscription(id: string, months: number) {
  return api<{ user: AdminUser; gift: { months: number; expiresAt: string } }>(
    `/api/admin/users/${id}/gift-subscription`,
    {
      method: 'POST',
      body: JSON.stringify({ months }),
    },
  )
}

export async function deleteAdminUser(id: string) {
  return api(`/api/admin/users/${id}`, { method: 'DELETE' })
}

export interface LegalConsentRecord {
  id: string
  consentType: 'terms' | 'privacy' | 'kvkk' | 'cookies' | 'creator_terms'
  documentSlug: string
  documentVersion: string
  userName: string
  userEmail: string | null
  ipAddress: string
  acceptedAt: string
  consentText: string
}

export async function fetchLegalDocuments() {
  return api<{ version: string; documents: Record<LegalSlug, LegalDocument> }>('/api/legal/documents')
}

export async function fetchAdminLegalDocuments() {
  return api<{ version: string; documents: Record<LegalSlug, LegalDocument> }>('/api/admin/legal')
}

export async function updateAdminLegalDocument(
  slug: LegalSlug,
  data: { title: string; sections: Array<{ heading: string; body: string }> },
) {
  return api<{ document: LegalDocument; version: string }>(`/api/admin/legal/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function resetAdminLegalDocument(slug: LegalSlug) {
  return api<{ document: LegalDocument; version: string }>(`/api/admin/legal/${slug}/reset`, {
    method: 'POST',
  })
}

export async function fetchLegalConsents() {
  return api<{ consents: LegalConsentRecord[] }>('/api/legal/consents')
}

export async function fetchAdminUserLegalConsents(userId: string) {
  return api<{ consents: LegalConsentRecord[] }>(`/api/admin/users/${encodeURIComponent(userId)}/legal-consents`)
}

export async function recordCookieConsent(data: {
  choice: 'accepted' | 'essential-only'
  sessionId?: string
  userName?: string
}) {
  return api<{ consent: LegalConsentRecord }>('/api/legal/cookie-consent', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export interface UserMessage {
  id: string
  userId: string
  subject: string
  body: string
  sentByAdminId: string | null
  readAt: string | null
  createdAt: string
  isRead: boolean
}

export async function fetchUserMessages() {
  return api<{ messages: UserMessage[] }>('/api/messages')
}

export async function fetchUnreadMessageCount() {
  return api<{ count: number }>('/api/messages/unread-count')
}

export async function markUserMessageRead(id: string) {
  return api<{ message: UserMessage }>(`/api/messages/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  })
}

export async function sendAdminUserMessage(userId: string, data: { subject: string; body: string }) {
  return api<{ message: UserMessage }>(`/api/admin/messages/users/${encodeURIComponent(userId)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function broadcastAdminMessage(data: {
  subject: string
  body: string
  audience?: 'all' | 'active_subscribers'
}) {
  return api<{ sent: number; audience: string }>('/api/admin/messages/broadcast', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export interface BillingPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year' | 'once'
  audience?: 'viewer' | 'creator'
  features: string[]
  popular?: boolean
  requiresStudentId?: boolean
  enabled?: boolean
}

export type AdminBillingPlan = BillingPlan

export async function fetchAdminBillingPlans(): Promise<{
  plans: AdminBillingPlan[]
  overrides: Record<string, unknown>
}> {
  return api('/api/admin/billing-plans')
}

export async function saveAdminBillingPlans(
  plans: Record<
    string,
    {
      name?: string
      price?: number
      features?: string[]
      popular?: boolean
      enabled?: boolean
    }
  >,
) {
  return api<{ plans: AdminBillingPlan[]; overrides: Record<string, unknown> }>(
    '/api/admin/billing-plans',
    {
      method: 'PUT',
      body: JSON.stringify({ plans }),
    },
  )
}

export interface BillingProviders {
  paytr: boolean
  iyzico: boolean
  default: 'paytr' | 'iyzico'
  paymentRequired: boolean
  paymentReady: boolean
}

export interface SiteModeConfig {
  enabled: boolean
  launchAt: string | null
  headline: string
  subheadline: string
  allowViewerSignup: boolean
}

export async function fetchSiteMode() {
  return api<SiteModeConfig>('/api/site-mode')
}

export async function fetchAdminSiteMode() {
  return api<{ siteMode: SiteModeConfig }>('/api/admin/site-mode')
}

export async function updateAdminSiteMode(payload: Partial<SiteModeConfig>) {
  return api<{ siteMode: SiteModeConfig }>('/api/admin/site-mode', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
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
  | { demoMode: true; message: string; expiresAt?: string; paidAt?: string }

export async function startCheckout(
  planId: string,
  provider: 'paytr' | 'iyzico',
): Promise<CheckoutResult & { message?: string }> {
  return api('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId, provider }),
  })
}

export async function uploadBillingStudentId(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api<{ url: string }>('/api/billing/student-id', {
    method: 'POST',
    body: formData,
  })
  return result.url
}

export async function fetchSubscription(): Promise<{
  status: string
  plan: string | null
  startedAt: string | null
  expiresAt: string | null
  cancelledAt: string | null
  canPlay: boolean
  paymentRequired: boolean
  canCancel: boolean
}> {
  return api('/api/billing/subscription')
}

export interface BillingInvoice {
  id: string
  merchantOid: string
  planId: string
  planName: string
  provider: string
  amountTl: number
  paidAt: string
  status: string
}

export async function fetchBillingInvoices() {
  return api<{ invoices: BillingInvoice[] }>('/api/billing/invoices')
}

export async function cancelSubscription() {
  return api<{ ok: boolean; status: string; cancelledAt: string; expiresAt: string | null }>(
    '/api/billing/subscription/cancel',
    { method: 'POST' },
  )
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

export type DailyWatchUsage = {
  usageDate: string
  titlesUsed: number
  titleLimit: number
  totalSeconds: number
  minutesUsed: number
  minuteLimit: number
  titlesRemaining: number
  minutesRemaining: number
}

export type PlaybackStartResult = {
  ok: boolean
  allowed?: boolean
  active?: boolean
  reason?: 'other_device' | 'daily_limit' | 'no_session'
  limitType?: 'minutes' | 'titles'
  message?: string
  usage?: DailyWatchUsage
}

export async function startPlaybackSession(data: {
  sessionId: string
  contentId: string
  episodeId?: string
}) {
  return api<PlaybackStartResult>('/api/playback/start', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function heartbeatPlaybackSession(sessionId: string, secondsDelta = 0) {
  return api<{
    ok: boolean
    active: boolean
    reason?: string
    message?: string
    usage?: DailyWatchUsage
  }>('/api/playback/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ sessionId, secondsDelta }),
  })
}

export async function stopPlaybackSession(sessionId: string, secondsDelta = 0) {
  return api<{ ok: boolean; usage?: DailyWatchUsage }>('/api/playback/stop', {
    method: 'POST',
    body: JSON.stringify({ sessionId, secondsDelta }),
  })
}

export async function fetchDailyWatchUsage() {
  return api<{ usage: DailyWatchUsage }>('/api/playback/usage')
}

export async function fetchAllWatchProgress() {
  return api<{
    items: Array<{
      contentId: string
      episodeId: string | null
      position: number
      duration: number
      totalWatched: number
      qualified?: boolean
      qualifiedSeconds?: number
      updatedAt?: string
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

export interface MonthlyAccountingPeriod {
  month: string
  status: 'open' | 'closed'
  totalQualifiedMinutes: number
  closedAt?: string | null
}

export interface MonthlyAccountingItem {
  contentId: string
  title: string
  type: string
  program: 'platform' | 'standard' | 'student_cinema'
  creatorId: string | null
  creatorName: string | null
  studioName: string | null
  qualifiedMinutes: number
  watchMinutes: number
  viewerCount: number
  sharePercent: number
  avgCompletionPercent: number
  qualifiedViewerPercent: number
  completionViewerCount: number
}

export interface MonthlyAccountingReport {
  month: string
  status: 'open' | 'closed'
  totalQualifiedMinutes: number
  totalWatchMinutes: number
  items: MonthlyAccountingItem[]
  memberStats: {
    totalMembers: number
    newMembersThisMonth: number
  }
}

export async function fetchAdminMonthlyPeriods() {
  return api<{ periods: MonthlyAccountingPeriod[] }>('/api/admin/analytics/monthly-periods')
}

export async function fetchAdminMonthlyReport(
  month: string,
  program: 'all' | 'platform' | 'standard' | 'student_cinema' = 'all',
) {
  const query = new URLSearchParams({ month })
  if (program !== 'all') query.set('program', program)
  return api<{ report: MonthlyAccountingReport }>(`/api/admin/analytics/monthly-report?${query.toString()}`)
}

export interface SettlementPeriod {
  periodId: string
  label: string
  status: 'open' | 'confirmed' | 'paid'
  isCurrent: boolean
  confirmedAt: string | null
  paidAt: string | null
}

export interface SettlementPoolSummary {
  pool: 'short' | 'student' | 'documentary' | 'long' | 'plooy'
  label: string
  ratePercent: number
  effectiveRatePercent: number
  qualifiedMinutes: number
  contentCount: number
}

export interface SettlementContentItem {
  contentId: string
  title: string
  type: string
  program: 'standard' | 'student_cinema'
  pool: 'short' | 'student' | 'documentary' | 'long'
  poolLabel: string
  poolRatePercent: number
  creatorId: string | null
  creatorName: string | null
  studioName: string | null
  qualifiedMinutes: number
  watchMinutes: number
  viewerCount: number
  avgCompletionPercent: number
  qualifiedViewerPercent: number
  poolSharePercent: number
  profitSharePercent: number
}

export interface SettlementCreatorItem {
  creatorId: string
  creatorName: string | null
  studioName: string | null
  qualifiedMinutes: number
  profitSharePercent: number
  contentCount: number
}

export interface SettlementReport {
  periodId: string
  label: string
  months: string[]
  status: 'open' | 'confirmed' | 'paid'
  isEditable: boolean
  totalQualifiedMinutes: number
  totalWatchMinutes: number
  poolSummaries: SettlementPoolSummary[]
  totalCreatorSharePercent: number
  items: SettlementContentItem[]
  creators: SettlementCreatorItem[]
  confirmedAt: string | null
  paidAt: string | null
}

export async function fetchAdminSettlementPeriods() {
  return api<{ periods: SettlementPeriod[] }>('/api/admin/analytics/settlement-periods')
}

export async function fetchAdminSettlementReport(periodId: string) {
  return api<{ report: SettlementReport }>(
    `/api/admin/analytics/settlement-report?period=${encodeURIComponent(periodId)}`,
  )
}

export async function confirmAdminSettlementPeriod(periodId: string) {
  return api<{ report: SettlementReport }>('/api/admin/analytics/settlement-report/confirm', {
    method: 'POST',
    body: JSON.stringify({ periodId }),
  })
}

export async function markAdminSettlementPaid(periodId: string) {
  return api<{ report: SettlementReport }>('/api/admin/analytics/settlement-report/mark-paid', {
    method: 'POST',
    body: JSON.stringify({ periodId }),
  })
}

export async function reopenAdminSettlementPeriod(periodId: string) {
  return api<{ report: SettlementReport }>('/api/admin/analytics/settlement-report/reopen', {
    method: 'POST',
    body: JSON.stringify({ periodId }),
  })
}

export interface CreatorAccountingItem {
  contentId: string
  title: string
  type: string
  program: 'standard' | 'student_cinema'
  qualifiedMinutes: number
  watchMinutes: number
  viewerCount: number
}

export interface CreatorAccountingReport {
  month: string
  status: 'open' | 'closed'
  totalQualifiedMinutes: number
  totalWatchMinutes: number
  items: CreatorAccountingItem[]
}

export async function fetchCreatorAccountingMonths() {
  return api<{ months: Array<{ month: string; status: 'open' | 'closed' }> }>('/api/creator/accounting/months')
}

export async function fetchCreatorAccounting(month: string) {
  return api<CreatorAccountingReport>(`/api/creator/accounting?month=${encodeURIComponent(month)}`)
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

export async function fetchJournalPosts(options?: { page?: number; limit?: number }) {
  const params = new URLSearchParams()
  if (options?.page) params.set('page', String(options.page))
  if (options?.limit) params.set('limit', String(options.limit))
  const query = params.toString()
  return api<import('../types/journal').JournalListResponse>(
    query ? `/api/journal?${query}` : '/api/journal',
  )
}

export async function fetchJournalPost(slug: string) {
  return api<{ post: import('../types/journal').JournalPost }>(`/api/journal/${encodeURIComponent(slug)}`)
}

export interface CekimNotlariSection {
  id: string
  title: string
  hidden?: boolean
  items: import('../types/content').AdminContentItem[]
}

type CekimNotlariPayload = { title: string; sections: CekimNotlariSection[] }

let cekimNotlariCache: { fetchedAt: number; data: CekimNotlariPayload } | null = null
let cekimNotlariInflight: Promise<CekimNotlariPayload> | null = null
const CEKIM_NOTLARI_CACHE_MS = 3 * 60 * 1000

export function invalidateCekimNotlariCache() {
  cekimNotlariCache = null
}

export function seedCekimNotlariCache(data: CekimNotlariPayload) {
  cekimNotlariCache = { fetchedAt: Date.now(), data }
}

export type { CekimNotlariPayload }

export function prefetchCekimNotlariSections() {
  if (cekimNotlariCache && Date.now() - cekimNotlariCache.fetchedAt < CEKIM_NOTLARI_CACHE_MS) return
  if (cekimNotlariInflight) return
  cekimNotlariInflight = fetchCekimNotlariSections().finally(() => {
    cekimNotlariInflight = null
  })
}

export async function fetchCekimNotlariSections() {
  if (cekimNotlariCache && Date.now() - cekimNotlariCache.fetchedAt < CEKIM_NOTLARI_CACHE_MS) {
    return cekimNotlariCache.data
  }

  const data = await api<CekimNotlariPayload>('/api/cekim-notlari')
  cekimNotlariCache = { fetchedAt: Date.now(), data }
  return data
}

export async function fetchAdminCekimNotlari() {
  return api<{
    categories: Array<{ id: string; title: string }>
    sections: CekimNotlariSection[]
    items: import('../types/content').AdminContentItem[]
  }>('/api/admin/cekim-notlari')
}

export async function fetchAdminCekimNotlariItem(id: string) {
  return api<{ item: import('../types/content').AdminContentItem; categoryId: string }>(
    `/api/admin/cekim-notlari/${encodeURIComponent(id)}`,
  )
}

export async function createAdminCekimNotlariItem(data: Record<string, unknown>) {
  const result = await api<{ item: import('../types/content').AdminContentItem; categoryId: string }>(
    '/api/admin/cekim-notlari',
    { method: 'POST', body: JSON.stringify(data) },
  )
  invalidateCekimNotlariCache()
  return result
}

export async function updateAdminCekimNotlariItem(id: string, data: Record<string, unknown>) {
  const result = await api<{
    item: import('../types/content').ContentItem
    categoryId: string | null
    sections: CekimNotlariSection[]
  }>(
    `/api/admin/cekim-notlari/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(data) },
  )
  invalidateCekimNotlariCache()
  return result
}

export async function deleteAdminCekimNotlariItem(id: string) {
  await api<void>(`/api/admin/cekim-notlari/${encodeURIComponent(id)}`, { method: 'DELETE' })
  invalidateCekimNotlariCache()
}

export async function createAdminCekimNotlariCategory(title: string) {
  const result = await api<{ category: { id: string; title: string }; sections: CekimNotlariSection[] }>(
    '/api/admin/cekim-notlari/categories',
    { method: 'POST', body: JSON.stringify({ title }) },
  )
  invalidateCekimNotlariCache()
  return result
}

export async function updateAdminCekimNotlariCategory(
  categoryId: string,
  updates: { title?: string; hidden?: boolean },
) {
  const result = await api<{ category: { id: string; title: string; hidden?: boolean }; sections: CekimNotlariSection[] }>(
    `/api/admin/cekim-notlari/categories/${encodeURIComponent(categoryId)}`,
    { method: 'PATCH', body: JSON.stringify(updates) },
  )
  invalidateCekimNotlariCache()
  return result
}

export async function reorderAdminCekimNotlariCategories(orderedIds: string[]) {
  const result = await api<{ categories: Array<{ id: string; title: string }>; sections: CekimNotlariSection[] }>(
    '/api/admin/cekim-notlari/categories/reorder',
    { method: 'PATCH', body: JSON.stringify({ orderedIds }) },
  )
  invalidateCekimNotlariCache()
  return result
}

export async function reorderAdminCekimNotlariCategoryItems(categoryId: string, orderedIds: string[]) {
  const result = await api<{ sections: CekimNotlariSection[] }>(
    `/api/admin/cekim-notlari/categories/${encodeURIComponent(categoryId)}/items/reorder`,
    { method: 'PATCH', body: JSON.stringify({ orderedIds }) },
  )
  invalidateCekimNotlariCache()
  return result
}

export async function deleteAdminCekimNotlariCategory(categoryId: string) {
  const result = await api<{ sections: CekimNotlariSection[] }>(
    `/api/admin/cekim-notlari/categories/${encodeURIComponent(categoryId)}`,
    { method: 'DELETE' },
  )
  invalidateCekimNotlariCache()
  return result
}

export async function fetchAdminJournalPosts() {
  return api<{
    posts: import('../types/journal').JournalPost[]
    pinnedIds: string[]
  }>('/api/admin/journal')
}

export async function fetchAdminJournalPins() {
  return api<{ pinnedIds: string[]; maxPins: number }>('/api/admin/journal/pins')
}

export async function updateAdminJournalPins(pinnedIds: string[]) {
  return api<{ pinnedIds: string[]; maxPins: number }>('/api/admin/journal/pins', {
    method: 'PUT',
    body: JSON.stringify({ pinnedIds }),
  })
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
  filmLink?: string
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
    creator: {
      id: string
      studioName: string
      status: string
      documentCount: number
      program?: string
      schoolId?: string | null
      registrationPaidAt?: string | null
      registrationPaid?: boolean
    }
    payoutRules: { note: string }
    content: Array<ContentItem & { reviewStatus: string; qualifiedMinutes: number; likes: number }>
    totals: { qualifiedMinutes: number; watchMinutes: number; likes: number; viewers: number; publishedCount: number; pendingCount: number }
  }>('/api/creator/dashboard')
}

export async function creatorFetchMessages() {
  return api<{
    messages: Array<{
      id: string
      subject: string
      body: string
      createdAt: string
      isRead: boolean
    }>
  }>('/api/creator/messages')
}

export async function creatorMarkMessageRead(messageId: string) {
  return api<{ message: { id: string; isRead: boolean } }>(`/api/creator/messages/${messageId}/read`, {
    method: 'PATCH',
  })
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
  return api<{ document: { id: string; docType: string; fileUrl: string; uploadedAt: string } }>(
    '/api/creator/documents',
    {
      method: 'POST',
      body: JSON.stringify({ docType, fileUrl }),
    },
  )
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

export interface AdminCreatorContent extends ContentItem, AdminContentMeta {
  reviewStatus: string
  sourceVideoUrl?: string
  qualifiedMinutes: number
  watchMinutes: number
  watchCount: number
  likes: number
  viewers: number
}

export interface AdminCreatorContentDetail extends AdminCreatorContent {
  studioName?: string | null
  creatorName?: string | null
  creatorEmail?: string | null
  applicationDeclaration?: {
    declaredAt: string
    rights: Record<string, boolean>
    legal: Record<string, boolean>
  } | null
  applicationDocuments?: AdminCreatorDocument[]
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

export async function fetchAdminCreatorContentDetail(contentId: string) {
  return api<{ item: AdminCreatorContentDetail }>(`/api/admin/creators/content/${contentId}`)
}

export async function updateAdminCreatorContent(contentId: string, data: Record<string, unknown>) {
  return api<{ item: AdminCreatorContentDetail }>(`/api/admin/creators/content/${contentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function fetchAdminCreatorSourceDownload(contentId: string) {
  const token = getToken()
  const base = getApiBase()
  const response = await fetch(`${base}/api/admin/creators/content/${contentId}/source-download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? 'Video indirilemedi.')
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json() as Promise<{ url: string; external: true }>
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') ?? ''
  const match = disposition.match(/filename="?([^";]+)"?/)
  const filename = match?.[1] ?? 'creator-video.mp4'
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
  return { downloaded: true as const }
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

export interface AdminStudentCinemaItem extends ContentItem, AdminContentMeta {
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
  displayName?: string | null
  creatorEmail?: string | null
  creatorPhone?: string | null
  projectCrew?: string | null
  parentTitle?: string | null
  qualifiedMinutes?: number
  watchMinutes?: number
  watchCount?: number
  likes?: number
  viewers?: number
}

export interface AdminStudentCinemaDocument {
  id: string
  docType: string
  fileUrl: string
  uploadedAt: string
}

export interface AdminStudentCinemaDetail {
  item: AdminStudentCinemaItem
  documents: AdminStudentCinemaDocument[]
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

export async function fetchAdminStudentCinemaDetail(contentId: string) {
  return api<AdminStudentCinemaDetail>(`/api/admin/student-cinema/content/${encodeURIComponent(contentId)}`)
}

export async function updateAdminStudentCinemaContent(
  contentId: string,
  data: Record<string, unknown>,
) {
  return api<{ item: AdminStudentCinemaItem }>(`/api/admin/student-cinema/content/${encodeURIComponent(contentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function bulkReviewAdminStudentCinemaContent(data: {
  ids: string[]
  reviewStatus: 'published' | 'rejected' | 'pending'
  schoolReviewStatus?: 'approved' | 'rejected' | 'pending' | 'none'
}) {
  return api<{ updated: number; errors: string[] }>('/api/admin/student-cinema/content/bulk-review', {
    method: 'POST',
    body: JSON.stringify(data),
  })
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
  options?: { publishedAt?: string; publishNow?: boolean },
) {
  return api<{ item: AdminStudentCinemaItem }>(`/api/admin/student-cinema/content/${contentId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ reviewStatus, ...options }),
  })
}

export async function deleteAdminStudentCinemaContent(contentId: string) {
  return api<void>(`/api/admin/student-cinema/content/${encodeURIComponent(contentId)}`, {
    method: 'DELETE',
  })
}

export async function bulkDeleteAdminStudentCinemaContent(ids: string[]) {
  return api<{ deleted: number; errors: string[] }>('/api/admin/student-cinema/content/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function fetchAdForContent(contentId: string, isKidsProfile = false) {
  const headers = new Headers()
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const profileId = getProfileId()
  if (profileId) headers.set('X-Profile-Id', profileId)
  if (isKidsProfile) headers.set('X-Kids-Profile', '1')

  const response = await fetch(`${getApiBase()}/api/ads/for-content/${encodeURIComponent(contentId)}`, {
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    return { show: false as const }
  }

  return response.json() as Promise<{ show: false } | AdPlayback>
}

export async function recordAdView(campaignId: string, contentId: string) {
  return api<{ ok: boolean }>(`/api/ads/${encodeURIComponent(campaignId)}/viewed`, {
    method: 'POST',
    body: JSON.stringify({ contentId }),
  })
}

export async function fetchAdminAdCampaigns() {
  return api<{ campaigns: AdCampaign[] }>('/api/admin/ads')
}

export async function createAdminAdCampaign(input: AdCampaignFormInput) {
  return api<{ campaign: AdCampaign }>('/api/admin/ads', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateAdminAdCampaign(id: string, input: AdCampaignFormInput) {
  return api<{ campaign: AdCampaign }>(`/api/admin/ads/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function toggleAdminAdCampaign(id: string) {
  return api<{ campaign: AdCampaign }>(`/api/admin/ads/${encodeURIComponent(id)}/toggle`, {
    method: 'PATCH',
  })
}

export async function deleteAdminAdCampaign(id: string) {
  return api<{ ok: boolean }>(`/api/admin/ads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
