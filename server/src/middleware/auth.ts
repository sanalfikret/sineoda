import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { dbGet } from '../db.js'
import type { CreatorRow, JwtPayload, UserRow } from '../types.js'
import { isCreatorRegistrationPaid } from '../services/creatorRegistration.js'

/** Oturum süresi — env ile kısaltılamaz (admin panel 2dk logout sorununu önler). */
const JWT_EXPIRES_IN = '30d'

export function resolveJwtExpiresIn() {
  return JWT_EXPIRES_IN
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: resolveJwtExpiresIn() })
}

export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}

export interface AuthRequest extends Request {
  auth?: JwtPayload
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Oturum gerekli.' })
    return
  }

  try {
    const payload = verifyToken(header.slice(7))
    req.auth = payload
    // Her istekte oturumu 30 güne uzat (admin 2dk logout önlemi)
    res.setHeader('X-Sineoda-Token', signToken({ userId: payload.userId, role: payload.role }))
    next()
  } catch {
    res.status(401).json({ error: 'Geçersiz oturum.' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = dbGet<UserRow>('SELECT role FROM users WHERE id = ?', [req.auth!.userId])
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      res.status(403).json({ error: 'Admin yetkisi gerekli.' })
      return
    }
    if (req.auth && req.auth.role !== user.role) {
      req.auth = { ...req.auth, role: user.role }
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

export function requireApprovedCreator(req: AuthRequest, res: Response, next: NextFunction) {
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
    if (!isCreatorRegistrationPaid(creator)) {
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
