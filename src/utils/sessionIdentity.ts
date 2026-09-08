/** Identity comparison only; authorization is always checked by the server. */
export function sessionIdentity(token: string | null): string | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.userId === 'string' ? payload.userId : token
  } catch { return token }
}
export function matchesRequestSession(current: string | null, requested: string | null) {
  return Boolean(current && requested && sessionIdentity(current) === sessionIdentity(requested))
}
