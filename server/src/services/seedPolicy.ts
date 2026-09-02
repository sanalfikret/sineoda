import { config } from '../config.js'

/** Production'da mevcut içerik satırlarını startup seed'leri ile ezme. */
export function preserveExistingContent() {
  return config.isProduction
}

/** Production'da bilinen şifreli demo hesap seed'lerini atla. */
export function allowDemoAccountSeed() {
  return !config.isProduction
}
