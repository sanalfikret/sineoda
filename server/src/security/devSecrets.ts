import { config } from '../config.js'

/** OTP / reset URL gibi geliştirme sırlarını API yanıtında göster. Production'da asla. */
export function allowDevSecretLeaks() {
  return !config.isProduction
}

export function stripDevFields<T extends Record<string, unknown>>(payload: T): T {
  if (allowDevSecretLeaks()) return payload
  const next = { ...payload }
  for (const key of ['devCode', 'devResetUrl', 'devVerifyUrl', 'devConfirmUrl'] as const) {
    delete next[key]
  }
  return next
}
