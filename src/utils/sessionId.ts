import { createRandomId } from './id'

const SESSION_KEY = 'sineoda_session_id'

export function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = createRandomId()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}
