import type { Response } from 'express'
import { dbGet } from '../db.js'
import type { ProfileRow } from '../types.js'
import { getProfileId, type AuthRequest } from './auth.js'

export function validateProfile(req: AuthRequest, res: Response): ProfileRow | undefined {
  const profileId = getProfileId(req)
  if (!profileId) {
    res.status(400).json({ error: 'Profil gerekli.' })
    return undefined
  }

  const profile = dbGet<ProfileRow>('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [
    profileId,
    req.auth!.userId,
  ])
  if (!profile) {
    res.status(404).json({ error: 'Profil bulunamadı.' })
    return undefined
  }

  return profile
}
