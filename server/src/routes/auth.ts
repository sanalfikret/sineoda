import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { config } from '../config.js'
import { dbAll, dbGet, dbRun } from '../db.js'
import { getProfileId, requireAuth, signToken, type AuthRequest } from '../middleware/auth.js'
import { mapProfile, mapUser } from '../mappers.js'
import { sendPasswordResetEmail } from '../services/email.js'
import { isValidTurkishMobile, normalizePhone, sendVerificationSms } from '../services/sms.js'
import type { ProfileRow, UserRow } from '../types.js'

const router = Router()

function getUserWithProfiles(userId: string) {
  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!user) return null
  const profiles = dbAll<ProfileRow>('SELECT * FROM profiles WHERE user_id = ? ORDER BY name', [userId])
  return mapUser(user, profiles)
}

router.post('/sms/send', async (req, res) => {
  const phone = String(req.body.phone ?? '')
  if (!isValidTurkishMobile(phone)) {
    res.status(400).json({ error: 'Geçerli bir Türkiye cep telefonu numarası girin (5xx xxx xx xx).' })
    return
  }

  const normalized = normalizePhone(phone)
  const existing = dbGet('SELECT id FROM users WHERE phone = ?', [normalized])
  if (existing) {
    res.status(409).json({ error: 'Bu telefon numarası zaten kayıtlı.' })
    return
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  dbRun('DELETE FROM phone_verification_codes WHERE phone = ?', [normalized])
  dbRun(
    'INSERT INTO phone_verification_codes (id, phone, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [uuid(), normalized, code, expiresAt, new Date().toISOString()],
  )

  try {
    const result = await sendVerificationSms(normalized, code)
    res.json({
      message: 'Doğrulama kodu gönderildi.',
      expiresInSeconds: 300,
      ...(result.devMode ? { devCode: result.devCode } : {}),
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'SMS gönderilemedi.' })
  }
})

router.post('/signup', async (req, res) => {
  const { name, email, password, phone, smsCode } = req.body as {
    name?: string
    email?: string
    password?: string
    phone?: string
    smsCode?: string
  }

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: 'Geçerli ad, e-posta ve en az 6 karakterli şifre gerekli.' })
    return
  }

  if (config.requireSmsVerification) {
    if (!phone?.trim() || !smsCode?.trim()) {
      res.status(400).json({ error: 'Telefon numarası ve SMS doğrulama kodu gerekli.' })
      return
    }
    if (!isValidTurkishMobile(phone)) {
      res.status(400).json({ error: 'Geçerli bir Türkiye cep telefonu numarası girin.' })
      return
    }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPhone = phone ? normalizePhone(phone) : null

  const exists = dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail])
  if (exists) {
    res.status(409).json({ error: 'Bu e-posta adresi zaten kayıtlı.' })
    return
  }

  if (normalizedPhone) {
    const phoneExists = dbGet('SELECT id FROM users WHERE phone = ?', [normalizedPhone])
    if (phoneExists) {
      res.status(409).json({ error: 'Bu telefon numarası zaten kayıtlı.' })
      return
    }
  }

  let phoneVerified = 0
  if (config.requireSmsVerification && normalizedPhone) {
    const record = dbGet<{ code: string; expires_at: string }>(
      'SELECT code, expires_at FROM phone_verification_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1',
      [normalizedPhone],
    )
    if (!record || record.code !== smsCode?.trim() || new Date(record.expires_at) < new Date()) {
      res.status(400).json({ error: 'Geçersiz veya süresi dolmuş doğrulama kodu.' })
      return
    }
    phoneVerified = 1
    dbRun('DELETE FROM phone_verification_codes WHERE phone = ?', [normalizedPhone])
  }

  const userId = uuid()
  const hash = bcrypt.hashSync(password, 10)
  dbRun(
    'INSERT INTO users (id, name, email, password_hash, role, created_at, phone, phone_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, name.trim(), normalizedEmail, hash, 'user', new Date().toISOString(), normalizedPhone, phoneVerified],
  )
  dbRun('INSERT INTO profiles (id, user_id, name, avatar, is_kids) VALUES (?, ?, ?, ?, ?)', [
    uuid(), userId, 'Ana Profil', '🎬', 0,
  ])
  dbRun('INSERT INTO profiles (id, user_id, name, avatar, is_kids) VALUES (?, ?, ?, ?, ?)', [
    uuid(), userId, 'Çocuk', '🚀', 1,
  ])

  const user = getUserWithProfiles(userId)!
  const token = signToken({ userId, role: user.role })
  res.status(201).json({ token, user })
})

router.post('/login', (req, res) => {
  const { email, password, requireAdmin } = req.body as {
    email?: string
    password?: string
    requireAdmin?: boolean
  }

  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'E-posta ve şifre gerekli.' })
    return
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()])
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'E-posta veya şifre hatalı.' })
    return
  }

  if (requireAdmin && user.role !== 'admin') {
    res.status(403).json({ error: 'Bu hesap admin yetkisine sahip değil.' })
    return
  }

  const publicUser = getUserWithProfiles(user.id)!
  const token = signToken({ userId: user.id, role: user.role })
  res.json({ token, user: publicUser })
})

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = getUserWithProfiles(req.auth!.userId)
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' })
    return
  }
  res.json({ user })
})

router.post('/profiles', requireAuth, (req: AuthRequest, res) => {
  const { name, avatar, isKids } = req.body as { name?: string; avatar?: string; isKids?: boolean }
  if (!name?.trim() || !avatar) {
    res.status(400).json({ error: 'Profil adı ve avatar gerekli.' })
    return
  }

  const profileId = uuid()
  dbRun('INSERT INTO profiles (id, user_id, name, avatar, is_kids) VALUES (?, ?, ?, ?, ?)', [
    profileId, req.auth!.userId, name.trim(), avatar, isKids ? 1 : 0,
  ])

  const user = getUserWithProfiles(req.auth!.userId)!
  res.status(201).json({ user, profile: user.profiles.find((p) => p.id === profileId) })
})

router.get('/profiles/validate', requireAuth, (req: AuthRequest, res) => {
  const profileId = getProfileId(req)
  if (!profileId) {
    res.status(400).json({ error: 'Profil ID gerekli.' })
    return
  }

  const profile = dbGet<ProfileRow>('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [
    profileId,
    req.auth!.userId,
  ])
  if (!profile) {
    res.status(404).json({ error: 'Profil bulunamadı.' })
    return
  }

  res.json({ profile: mapProfile(profile) })
})

router.post('/forgot-password', async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase()
  if (!email) {
    res.status(400).json({ error: 'E-posta gerekli.' })
    return
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE email = ?', [email])

  // Güvenlik: kullanıcı yoksa da aynı mesaj
  if (!user) {
    res.json({ message: 'E-posta kayıtlıysa sıfırlama bağlantısı gönderildi.' })
    return
  }

  const token = uuid()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  dbRun('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', [user.id])
  dbRun(
    'INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used) VALUES (?, ?, ?, ?, 0)',
    [uuid(), user.id, token, expiresAt],
  )

  const resetUrl = `${config.frontendUrl}/sifre-sifirla?token=${token}`
  const result = await sendPasswordResetEmail(email, resetUrl)

  res.json({
    message: 'E-posta kayıtlıysa sıfırlama bağlantısı gönderildi.',
    ...(result.devMode ? { devResetUrl: result.resetUrl } : {}),
  })
})

router.post('/reset-password', (req, res) => {
  const token = String(req.body.token ?? '')
  const password = String(req.body.password ?? '')

  if (!token || password.length < 6) {
    res.status(400).json({ error: 'Geçerli token ve en az 6 karakterli şifre gerekli.' })
    return
  }

  const record = dbGet<{ user_id: string; expires_at: string; used: number }>(
    'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?',
    [token],
  )

  if (!record || record.used || new Date(record.expires_at) < new Date()) {
    res.status(400).json({ error: 'Geçersiz veya süresi dolmuş bağlantı.' })
    return
  }

  dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [
    bcrypt.hashSync(password, 10),
    record.user_id,
  ])
  dbRun('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token])

  res.json({ message: 'Şifren güncellendi. Giriş yapabilirsin.' })
})

export default router
