/**
 * Frontend yapılandırması — tek dosya.
 * Sunucu taşımada: .env içinde VITE_* değerlerini güncelle (çoğu VPS'te boş = same-origin).
 */
import { BRAND_NAME } from '../constants/brand'

const emailDomain = String(import.meta.env.VITE_EMAIL_DOMAIN ?? 'plooy.tv').replace(/^@/, '')

export const appConfig = {
  brandName: BRAND_NAME,
  emails: {
    support: String(import.meta.env.VITE_CONTACT_EMAIL ?? `destek@${emailDomain}`),
    kvkk: String(import.meta.env.VITE_KVKK_EMAIL ?? `kvkk@${emailDomain}`),
    admin: String(import.meta.env.VITE_ADMIN_EMAIL ?? `admin@${emailDomain}`),
    demo: String(import.meta.env.VITE_DEMO_EMAIL ?? `demo@${emailDomain}`),
  },
  /** Build-time API kökü. Production VPS same-origin: boş string. */
  viteApiUrl: String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, ''),
} as const
