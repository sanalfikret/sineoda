import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { dbGet } from '../db.js'
import type { JwtPayload, UserRow } from '../types.js'

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
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
    req.auth = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'Geçersiz oturum.' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = dbGet<UserRow>('SELECT role FROM users WHERE id = ?', [req.auth!.userId])
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin yetkisi gerekli.' })
      return
    }
    if (req.auth && req.auth.role !== user.role) {
      req.auth = { ...req.auth, role: user.role }
    }
    next()
  })
}

export function getProfileId(req: Request) {
  const profileId = req.headers['x-profile-id']
  return typeof profileId === 'string' ? profileId : null
}
