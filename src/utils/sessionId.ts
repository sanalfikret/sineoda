import { createRandomId } from './id'

const SESSION_KEY = 'plooy_session_id'
const LEGACY_SESSION_KEY = 'sineoda_session_id'

let memorySessionId = ''

function persistSessionId(sessionId: string) {
  try {
    localStorage.setItem(SESSION_KEY, sessionId)
    localStorage.removeItem(LEGACY_SESSION_KEY)
    return
  } catch {
    /* TV tarayıcısı localStorage kapalı olabilir */
  }
  try {
    sessionStorage.setItem(SESSION_KEY, sessionId)
  } catch {
    memorySessionId = sessionId
  }
}

function readSessionId() {
  try {
    const local = localStorage.getItem(SESSION_KEY) ?? localStorage.getItem(LEGACY_SESSION_KEY)
    if (local) return local
  } catch {
    /* ignore */
  }
  try {
    const session = sessionStorage.getItem(SESSION_KEY)
    if (session) return session
  } catch {
    /* ignore */
  }
  return memorySessionId || null
}

export function getSessionId() {
  const existing = readSessionId()
  if (existing) return existing

  const sessionId = createRandomId()
  persistSessionId(sessionId)
  return sessionId
}
