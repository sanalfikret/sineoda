import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { contactEmails, smtpFromDefault } from './constants/contact.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

function parseCorsOrigins() {
  const primary = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  const extra = String(process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return [...new Set([primary, ...DEV_ORIGINS, ...extra])]
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? 'sineoda-dev-secret-change-in-production',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:3001',
  corsOrigins: parseCorsOrigins(),
  contactEmails,
  dataDir: process.env.DATA_DIR ?? path.join(__dirname, '..', 'data'),
  uploadsDir: process.env.UPLOADS_DIR ?? path.join(__dirname, '..', 'uploads'),
  /** Production: build edilmiş React dosyalarının yolu (tek sunucu kurulumu) */
  webDistDir: process.env.WEB_DIST_DIR ?? '',
  isProduction: process.env.NODE_ENV === 'production',
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? 'paytr') as 'paytr' | 'iyzico',
  requireSubscription: process.env.REQUIRE_SUBSCRIPTION !== 'false',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: smtpFromDefault(),
  },
  paytr: {
    merchantId: process.env.PAYTR_MERCHANT_ID ?? '',
    merchantKey: process.env.PAYTR_MERCHANT_KEY ?? '',
    merchantSalt: process.env.PAYTR_MERCHANT_SALT ?? '',
    testMode: process.env.PAYTR_TEST_MODE !== '0',
  },
  iyzico: {
    apiKey: process.env.IYZICO_API_KEY ?? '',
    secretKey: process.env.IYZICO_SECRET_KEY ?? '',
    baseUrl: process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com',
  },
  isEmailConfigured() {
    return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass)
  },
  isPaytrConfigured() {
    return Boolean(config.paytr.merchantId && config.paytr.merchantKey && config.paytr.merchantSalt)
  },
  isIyzicoConfigured() {
    return Boolean(config.iyzico.apiKey && config.iyzico.secretKey)
  },
  isPaymentConfigured() {
    return config.isPaytrConfigured() || config.isIyzicoConfigured()
  },
  sms: {
    provider: (process.env.SMS_PROVIDER ?? '') as '' | 'netgsm',
    netgsm: {
      user: process.env.NETGSM_USER ?? '',
      pass: process.env.NETGSM_PASS ?? '',
      header: process.env.NETGSM_HEADER ?? 'PLOOY',
    },
  },
  requireSmsVerification: process.env.REQUIRE_SMS_VERIFICATION !== 'false',
  isSmsConfigured() {
    if (config.sms.provider === 'netgsm') {
      return Boolean(config.sms.netgsm.user && config.sms.netgsm.pass && config.sms.netgsm.header)
    }
    return false
  },
}

export function normalizeUploadPath(url: string) {
  const trimmed = String(url ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const match = trimmed.match(/\/uploads\/[^\s?#]+/i)
    if (match) return match[0]
    return trimmed
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/** Upload yanıtları — same-origin relative path (PUBLIC_URL domain hatasına dayanıklı). */
export function publicAssetUrl(relativePath: string) {
  if (relativePath.startsWith('http')) return normalizeUploadPath(relativePath)
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return path
}

/** E-posta vb. mutlak URL gereken yerler. */
export function publicAssetUrlAbsolute(relativePath: string) {
  const path = publicAssetUrl(relativePath)
  if (path.startsWith('http')) return path
  return `${config.publicUrl}${path}`
}
