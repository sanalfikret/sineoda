import { adminLogout, getToken, refreshSessionToken } from '../api/client'

const LOGIN_HINT_KEY = 'plooy_admin_login_hint'

/** Admin kayıt/PUT öncesi — token yoksa yenilemeyi dene. */
export async function ensureAdminWriteSession(): Promise<boolean> {
  if (getToken()) return true
  const refreshed = await refreshSessionToken()
  return Boolean(refreshed && getToken())
}

export function stashAdminLoginHint(message: string) {
  try {
    sessionStorage.setItem(LOGIN_HINT_KEY, message)
  } catch {
    /* ignore */
  }
}

export function readAdminLoginHint(): string | null {
  try {
    const value = sessionStorage.getItem(LOGIN_HINT_KEY)
    if (value) sessionStorage.removeItem(LOGIN_HINT_KEY)
    return value
  } catch {
    return null
  }
}

/** Oturum geçersiz — temiz çıkış ve giriş sayfasına yönlendir. */
export function forceAdminReLogin(message?: string) {
  if (message) stashAdminLoginHint(message)
  adminLogout()
}
