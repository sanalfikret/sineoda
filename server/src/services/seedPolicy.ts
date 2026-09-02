import { config } from '../config.js'

/** Production'da mevcut içerik satırlarını startup seed'leri ile ezme. */
export function preserveExistingContent() {
  return config.isProduction
}
