import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { dbGet } from '../db.js'
import type { CreatorRow, JwtPayload, UserRow } from '../types.js'
import { isCreatorRegistrationPaid } from '../services/creatorRegistration.js'

/** Oturum süresi — env ile kısaltılamaz (admin panel 2dk logout sorununu önler). */
const JWT_EXPIRES_IN = '30d'
/** Süresi dolmuş token en fazla bu kadar süre sonra yenilenir; sonrası tekrar giriş gerekir. */
const JWT_REFRESH_GRACE_MS = 7 * 24 * 60 * 60 * 1000

export function resolveJwtExpiresIn() {
  return JWT_EXPIRES_IN
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: resolveJwtExpiresIn() })
}

export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}

/** Süresi dolmuş ama imzası geçerli token — kısa yenileme penceresi içinde. */
export function readAuthPayload(token: string): JwtPayload | null {
  try {
    return verifyToken(token)
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret, { ignoreExpiration: true }) as JwtPayload & {
          exp?: number
        }
        if (!decoded.exp) return null
        const expiredForMs = Date.now() - decoded.exp * 1000
        if (expiredForMs > JWT_REFRESH_GRACE_MS) return null
        return decoded
      } catch {
        return null
      }
    }
    return null
  }
}

export interface AuthRequest extends Request {
  auth?: JwtPayload
  /** Oturum yenileme — JSON gövdesine de eklenir (CORS header kısıtına karşı). */
  refreshedToken?: string
}

function attachRefreshedToken(req: AuthRequest, user: Pick<UserRow, 'id' | 'role'>, res: Response) {
  const refreshed = signToken({ userId: user.id, role: user.role })
  req.auth = { userId: user.id, role: user.role }
  req.refreshedToken = refreshed
  res.setHeader('X-Plooy-Token', refreshed)
  res.setHeader('X-Sineoda-Token', refreshed)
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Oturum gerekli.' })
    return
  }

  const payload = readAuthPayload(header.slice(7))
  if (!payload) {
    res.status(401).json({ error: 'Geçersiz oturum.' })
    return
  }

  const user = dbGet<UserRow>('SELECT id, role FROM users WHERE id = ?', [payload.userId])
  if (!user) {
    res.status(401).json({ error: 'Kullanıcı bulunamadı.' })
    return
  }

  // Her istekte oturumu 30 güne uzat (süresi dolmuş token da yenilenir)
  attachRefreshedToken(req, user, res)
  next()
}

/** Oturum varsa doğrular; yoksa anonim isteğe izin verir. */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next()
    return
  }

  const payload = readAuthPayload(header.slice(7))
  if (!payload) {
    next()
    return
  }

  const user = dbGet<UserRow>('SELECT id FROM users WHERE id = ?', [payload.userId])
  if (user) req.auth = payload
  next()
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = dbGet<UserRow>('SELECT id, role FROM users WHERE id = ?', [req.auth!.userId])
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      res.status(403).json({ error: 'Admin yetkisi gerekli.' })
      return
    }
    if (req.auth?.role !== user.role) {
      attachRefreshedToken(req, user, res)
    }
    next()
  })
}

export function requireCreator(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = dbGet<UserRow>('SELECT role FROM users WHERE id = ?', [req.auth!.userId])
    if (!user || user.role !== 'creator') {
      res.status(403).json({ error: 'Yapımcı hesabı gerekli.' })
      return
    }
    if (req.auth && req.auth.role !== user.role) {
      req.auth = { ...req.auth, role: user.role }
    }
    next()
  })
}

export function getCreatorForUser(userId: string) {
  return dbGet<CreatorRow>('SELECT * FROM creators WHERE user_id = ?', [userId])
}

export function requireActiveCreator(req: AuthRequest, res: Response, next: NextFunction) {
  requireCreator(req, res, () => {
    const creator = getCreatorForUser(req.auth!.userId)
    if (!creator) {
      res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
      return
    }
    if (creator.status === 'rejected') {
      res.status(403).json({ error: 'Hesabınız reddedildi.', status: creator.status })
      return
    }
    if (creator.status === 'suspended') {
      res.status(403).json({ error: 'Hesabınız askıya alındı.', status: creator.status })
      return
    }
    ;(req as AuthRequest & { creator?: CreatorRow }).creator = creator
    next()
  })
}

export function requireApprovedCreator(req: AuthRequest, res: Response, next: NextFunction) {
  requireActiveCreator(req, res, () => {
    const creator = getCreatorForUser(req.auth!.userId)!
    const user = dbGet<Pick<UserRow, 'subscription_expires_at'>>(
      'SELECT subscription_expires_at FROM users WHERE id = ?',
      [req.auth!.userId],
    )
    if (!isCreatorRegistrationPaid(creator, user)) {
      res.status(402).json({
        error: 'Film başvurusu için başvuru ücretini ödemelisiniz.',
        code: 'CREATOR_PAYMENT_REQUIRED',
      })
      return
    }
    ;(req as AuthRequest & { creator?: CreatorRow }).creator = creator
    next()
  })
}

export function getProfileId(req: Request) {
  const profileId = req.headers['x-profile-id']
  return typeof profileId === 'string' ? profileId : null
}
