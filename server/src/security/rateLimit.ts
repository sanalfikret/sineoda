import rateLimit from 'express-rate-limit'

const jsonMessage = (error: string) => ({ error })

export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'),
})

export const authSmsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('SMS limiti aşıldı. Bir saat sonra tekrar deneyin.'),
})

export const authForgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Çok fazla sıfırlama isteği. Bir saat sonra tekrar deneyin.'),
})

export const contactFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Çok fazla mesaj gönderildi. Lütfen daha sonra tekrar deneyin.'),
})

export const analyticsVisitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('İstek limiti aşıldı.'),
})

export const authSignupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Çok fazla kayıt denemesi. Bir saat sonra tekrar deneyin.'),
})

export const authResetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Çok fazla şifre sıfırlama denemesi. Bir saat sonra tekrar deneyin.'),
})

export const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Çok fazla oturum yenileme isteği.'),
})

export const creatorAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Çok fazla giriş/kayıt denemesi. 15 dakika sonra tekrar deneyin.'),
})

export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('İstek limiti aşıldı.'),
})
