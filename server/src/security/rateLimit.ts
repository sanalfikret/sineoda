import type { Request } from 'express'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { getClientIp } from '../utils/clientIp.js'

const jsonMessage = (error: string) => ({ error })

function readTokenRole(req: Request): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret, {
      ignoreExpiration: true,
    }) as { role?: string }
    return payload.role ?? null
  } catch {
    return null
  }
}

function isAdminSession(req: Request) {
  const role = readTokenRole(req)
  return role === 'admin' || role === 'manager'
}

function apiPath(req: Request) {
  return (req.originalUrl ?? req.url).split('?')[0]
}

/** Kendi limitörü olan auth uçları global sayaca dahil edilmez (çift limit önlenir). */
const AUTH_LIMITED_PREFIXES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/refresh',
  '/api/auth/me',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/sms/',
  '/api/creator/auth/',
]

function hasDedicatedAuthLimiter(req: Request) {
  const path = apiPath(req)
  return AUTH_LIMITED_PREFIXES.some((prefix) => path.startsWith(prefix))
}

function shouldSkipGlobalLimit(req: Request) {
  const path = apiPath(req)
  if (path === '/api/health') return true
  if (hasDedicatedAuthLimiter(req)) return true
  if (isAdminSession(req)) return true
  return false
}

const sharedKey = (req: Request) => getClientIp(req)

export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  message: jsonMessage('Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'),
})

export const authSmsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  message: jsonMessage('SMS limiti aşıldı. Bir saat sonra tekrar deneyin.'),
})

export const authForgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  message: jsonMessage('Çok fazla sıfırlama isteği. Bir saat sonra tekrar deneyin.'),
})

export const contactFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  message: jsonMessage('Çok fazla mesaj gönderildi. Lütfen daha sonra tekrar deneyin.'),
})

export const analyticsVisitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  message: jsonMessage('İstek limiti aşıldı.'),
  skip: (req) => isAdminSession(req),
})

export const authSignupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  message: jsonMessage('Çok fazla kayıt denemesi. Bir saat sonra tekrar deneyin.'),
})

export const authResetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  message: jsonMessage('Çok fazla şifre sıfırlama denemesi. Bir saat sonra tekrar deneyin.'),
})

export const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  skip: (req) => isAdminSession(req),
  message: jsonMessage('Çok fazla oturum yenileme isteği.'),
})

export const creatorAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  message: jsonMessage('Çok fazla giriş/kayıt denemesi. 15 dakika sonra tekrar deneyin.'),
})

/** Genel API — admin oturumu ve auth uçları muaf; geri kalan trafik IP başına sınırlı. */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sharedKey,
  skip: shouldSkipGlobalLimit,
  message: jsonMessage('İstek limiti aşıldı.'),
})
