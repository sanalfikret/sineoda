import { BRAND_NAME } from './brand.js'

/** E-posta domain — .env EMAIL_DOMAIN ile değiştirilir (sunucu taşımada kod dokunulmaz). */
const emailDomain = (process.env.EMAIL_DOMAIN ?? 'plooy.tv').replace(/^@/, '')

export const contactEmails = {
  support: process.env.CONTACT_EMAIL ?? `destek@${emailDomain}`,
  kvkk: process.env.KVKK_EMAIL ?? `kvkk@${emailDomain}`,
  noreply: process.env.NOREPLY_EMAIL ?? `noreply@${emailDomain}`,
  admin: process.env.ADMIN_EMAIL ?? `admin@${emailDomain}`,
  demo: process.env.DEMO_EMAIL ?? `demo@${emailDomain}`,
} as const

export function smtpFromDefault() {
  return process.env.SMTP_FROM ?? `${BRAND_NAME} <${contactEmails.noreply}>`
}
