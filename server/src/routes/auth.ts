import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'node:path'
import { v4 as uuid } from 'uuid'
import { config, publicAssetUrl } from '../config.js'
import { dbAll, dbGet, dbRun, uploadsDir } from '../db.js'
import { getProfileId, readAuthPayload, requireAuth, signToken, verifyToken, type AuthRequest } from '../middleware/auth.js'
import { mapProfile, mapUser } from '../mappers.js'
import { isCreatorRegistrationPaid } from '../services/creatorRegistration.js'
import { sendPasswordResetEmail, sendEmailVerificationEmail, sendEmailChangeConfirmationEmail } from '../services/email.js'
import { getPlan, normalizePlanId, planRequiresStudentId } from '../services/plans.js'
import { isValidTurkishMobile, normalizePhone, sendVerificationSms } from '../services/sms.js'
import { recordSignupConsents } from '../services/legalConsent.js'
import { getSiteMode } from '../services/siteMode.js'
import { getClientIp, getUserAgent } from '../utils/clientIp.js'
import { allowDevSecretLeaks } from '../security/devSecrets.js'
import {
  authForgotPasswordLimiter,
  authLoginLimiter,
  authRefreshLimiter,
  authResetPasswordLimiter,
  authSignupLimiter,
  authSmsLimiter,
} from '../security/rateLimit.js'
import type { JwtPayload, ProfileRow, UserRow } from '../types.js'

const router = Router()

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `avatar-${uuid()}${ext}`)
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Sadece görsel dosyaları yüklenebilir.'))
  },
})

function getUserWithProfiles(userId: string) {
  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!user) return null
  const profiles = dbAll<ProfileRow>('SELECT * FROM profiles WHERE user_id = ? ORDER BY name', [userId])
  return mapUser(user, profiles)
}

function isEmailVerified(user: UserRow) {
  return user.role === 'admin' || user.role === 'manager' || Boolean(user.email_verified)
}

async function createEmailVerificationToken(userId: string, email: string) {
  const token = uuid()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  dbRun('UPDATE email_verification_tokens SET used = 1 WHERE user_id = ? AND used = 0', [userId])
  dbRun(
    'INSERT INTO email_verification_tokens (id, user_id, token, expires_at, used) VALUES (?, ?, ?, ?, 0)',
    [uuid(), userId, token, expiresAt],
  )

  const verifyUrl = `${config.frontendUrl}/eposta-dogrula?token=${token}`
  return sendEmailVerificationEmail(email, verifyUrl)
}

async function createEmailChangeToken(userId: string, newEmail: string) {
  const token = uuid()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  dbRun('UPDATE email_change_tokens SET used = 1 WHERE user_id = ? AND used = 0', [userId])
  dbRun(
    'INSERT INTO email_change_tokens (id, user_id, new_email, token, expires_at, used) VALUES (?, ?, ?, ?, ?, 0)',
    [uuid(), userId, newEmail, token, expiresAt],
  )

  const confirmUrl = `${config.frontendUrl}/eposta-degistir?token=${token}`
  return sendEmailChangeConfirmationEmail(newEmail, confirmUrl)
}

router.post('/sms/send', authSmsLimiter, async (req, res) => {
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
      ...(allowDevSecretLeaks() && result.devMode ? { devCode: result.devCode } : {}),
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'SMS gönderilemedi.' })
  }
})

router.post('/signup', authSignupLimiter, async (req, res) => {
  const siteMode = getSiteMode()
  if (siteMode.enabled && !siteMode.allowViewerSignup) {
    res.status(503).json({
      error: 'İzleyici kaydı henüz açılmadı. Açılış tarihini ana sayfadaki geri sayımdan takip edebilirsiniz.',
      code: 'SITE_COMING_SOON',
    })
    return
  }

  const { name, email, password, phone, smsCode, planId, studentIdUrl, acceptTerms, acceptPrivacy, acceptKvkk } = req.body as {
    name?: string
    email?: string
    password?: string
    phone?: string
    smsCode?: string
    planId?: string
    studentIdUrl?: string
    acceptTerms?: boolean
    acceptPrivacy?: boolean
    acceptKvkk?: boolean
  }

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: 'Geçerli ad, e-posta ve en az 6 karakterli şifre gerekli.' })
    return
  }

  if (!acceptTerms || !acceptPrivacy || !acceptKvkk) {
    res.status(400).json({
      error: 'Kayıt için Kullanım Koşulları, Gizlilik Politikası ve KVKK / Açık Rıza onayı zorunludur.',
    })
    return
  }

  const selectedPlanId = normalizePlanId(String(planId ?? 'standard')) ?? 'standard'
  const plan = getPlan(selectedPlanId)
  if (!plan) {
    res.status(400).json({ error: 'Geçersiz abonelik planı.' })
    return
  }

  const studentId = studentIdUrl?.trim() || null
  if (planRequiresStudentId(selectedPlanId) && !studentId) {
    res.status(400).json({ error: 'Öğrenci planı için öğrenci kimliği yüklemeniz gerekir.' })
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
    'INSERT INTO users (id, name, email, password_hash, role, created_at, phone, phone_verified, email_verified, pending_plan_id, student_id_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      userId,
      name.trim(),
      normalizedEmail,
      hash,
      'user',
      new Date().toISOString(),
      normalizedPhone,
      phoneVerified,
      0,
      selectedPlanId,
      studentId,
    ],
  )
  dbRun('INSERT INTO profiles (id, user_id, name, avatar, is_kids) VALUES (?, ?, ?, ?, ?)', [
    uuid(), userId, 'Ana Profil', '🎬', 0,
  ])
  dbRun('INSERT INTO profiles (id, user_id, name, avatar, is_kids) VALUES (?, ?, ?, ?, ?)', [
    uuid(), userId, 'Çocuk', '🚀', 1,
  ])

  try {
    recordSignupConsents({
      userId,
      userName: name.trim(),
      userEmail: normalizedEmail,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      acceptTerms: Boolean(acceptTerms),
      acceptPrivacy: Boolean(acceptPrivacy),
      acceptKvkk: Boolean(acceptKvkk),
    })
  } catch (consentError) {
    dbRun('DELETE FROM profiles WHERE user_id = ?', [userId])
    dbRun('DELETE FROM users WHERE id = ?', [userId])
    res.status(400).json({
      error: consentError instanceof Error ? consentError.message : 'Yasal onay kaydedilemedi.',
    })
    return
  }

  const emailResult = await createEmailVerificationToken(userId, normalizedEmail)

  res.status(201).json({
    message:
      'Kayıt alındı. E-postanı doğrula, ardından giriş yap — seçtiğin plan için ödeme adımına yönlendirileceksin.',
    email: normalizedEmail,
    planId: selectedPlanId,
    ...(allowDevSecretLeaks() && emailResult.devMode ? { devVerifyUrl: emailResult.verifyUrl } : {}),
  })
})

router.post('/login', authLoginLimiter, (req, res) => {
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

  if (!isEmailVerified(user)) {
    res.status(403).json({
      error: 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et veya doğrulama e-postasını yeniden gönder.',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    })
    return
  }

  if (requireAdmin && user.role !== 'admin' && user.role !== 'manager') {
    res.status(403).json({ error: 'Bu hesap admin yetkisine sahip değil.' })
    return
  }

  const publicUser = getUserWithProfiles(user.id)!
  const token = signToken({ userId: user.id, role: user.role })
  res.setHeader('X-Plooy-Token', token)
  res.setHeader('X-Sineoda-Token', token)
  res.json({ token, user: publicUser })
})

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = getUserWithProfiles(req.auth!.userId)
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' })
    return
  }

  if (user.role === 'creator') {
    const creator = dbGet<{
      id: string
      studio_name: string
      bio: string
      status: string
      legal_accepted_at: string | null
      created_at: string
      program?: string
      school_id?: string | null
      registration_paid_at?: string | null
    }>(
      'SELECT id, studio_name, bio, status, legal_accepted_at, created_at, program, school_id, registration_paid_at FROM creators WHERE user_id = ?',
      [req.auth!.userId],
    )
    const token = signToken({ userId: user.id, role: user.role })
    res.json({
      user: {
        ...user,
        creator: creator
          ? {
              id: creator.id,
              studioName: creator.studio_name,
              bio: creator.bio,
              status: creator.status,
              legalAcceptedAt: creator.legal_accepted_at,
              createdAt: creator.created_at,
              program: creator.program ?? 'standard',
              schoolId: creator.school_id ?? null,
              registrationPaidAt: creator.registration_paid_at ?? null,
              registrationPaid: isCreatorRegistrationPaid(creator),
            }
          : null,
      },
      token,
    })
    return
  }

  res.json({ user, token: signToken({ userId: user.id, role: user.role }) })
})

/** Süresi dolmuş ama imzası geçerli token ile yeni oturum (admin kaydet 401 önlemi). */
router.post('/refresh', authRefreshLimiter, (req, res) => {
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

  const token = signToken({ userId: user.id, role: user.role })
  res.setHeader('X-Plooy-Token', token)
  res.setHeader('X-Sineoda-Token', token)
  res.json({ token })
})

const MAX_PROFILES = 4

router.post('/change-password', requireAuth, (req: AuthRequest, res) => {
  const currentPassword = String(req.body.currentPassword ?? '')
  const newPassword = String(req.body.newPassword ?? '')

  if (!currentPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Mevcut şifre gerekli; yeni şifre en az 6 karakter olmalı.' })
    return
  }

  const row = dbGet<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [
    req.auth!.userId,
  ])
  if (!row || !bcrypt.compareSync(currentPassword, row.password_hash)) {
    res.status(401).json({ error: 'Mevcut şifre hatalı.' })
    return
  }

  dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [
    bcrypt.hashSync(newPassword, 10),
    req.auth!.userId,
  ])
  res.json({ ok: true })
})

router.post('/change-email', requireAuth, async (req: AuthRequest, res) => {
  const newEmail = String(req.body.newEmail ?? '').trim().toLowerCase()
  const password = String(req.body.password ?? '')

  if (!newEmail || !password) {
    res.status(400).json({ error: 'Yeni e-posta ve mevcut şifre gerekli.' })
    return
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [req.auth!.userId])
  if (!user || user.role !== 'user') {
    res.status(403).json({ error: 'Bu işlem yalnızca üye hesapları için geçerlidir.' })
    return
  }

  if (newEmail === user.email.toLowerCase()) {
    res.status(400).json({ error: 'Yeni e-posta mevcut adresinle aynı.' })
    return
  }

  const taken = dbGet<{ id: string }>('SELECT id FROM users WHERE email = ? AND id != ?', [
    newEmail,
    user.id,
  ])
  if (taken) {
    res.status(409).json({ error: 'Bu e-posta adresi başka bir hesapta kayıtlı.' })
    return
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Mevcut şifre hatalı.' })
    return
  }

  const emailResult = await createEmailChangeToken(user.id, newEmail)
  res.json({
    message: 'Onay bağlantısı yeni e-posta adresine gönderildi.',
    ...(allowDevSecretLeaks() && emailResult.devMode ? { devConfirmUrl: emailResult.confirmUrl } : {}),
  })
})

router.post('/confirm-email-change', (req, res) => {
  const token = String(req.body.token ?? '').trim()
  if (!token) {
    res.status(400).json({ error: 'Onay bağlantısı geçersiz.' })
    return
  }

  const record = dbGet<{ user_id: string; new_email: string; expires_at: string; used: number }>(
    'SELECT user_id, new_email, expires_at, used FROM email_change_tokens WHERE token = ?',
    [token],
  )

  if (!record || record.used || new Date(record.expires_at) < new Date()) {
    res.status(400).json({ error: 'Geçersiz veya süresi dolmuş onay bağlantısı.' })
    return
  }

  const taken = dbGet<{ id: string }>(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    [record.new_email, record.user_id],
  )
  if (taken) {
    res.status(409).json({ error: 'Bu e-posta adresi artık kullanılamaz.' })
    return
  }

  dbRun('UPDATE users SET email = ?, email_verified = 1 WHERE id = ?', [
    record.new_email,
    record.user_id,
  ])
  dbRun('UPDATE email_change_tokens SET used = 1 WHERE token = ?', [token])

  res.json({ message: 'E-posta adresin güncellendi. Yeni adresinle giriş yapabilirsin.' })
})

router.patch('/me', requireAuth, (req: AuthRequest, res) => {
  const name = String(req.body.name ?? '').trim()
  if (!name) {
    res.status(400).json({ error: 'Ad gerekli.' })
    return
  }

  dbRun('UPDATE users SET name = ? WHERE id = ?', [name, req.auth!.userId])
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

  const count = dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM profiles WHERE user_id = ?',
    [req.auth!.userId],
  )
  if ((count?.count ?? 0) >= MAX_PROFILES) {
    res.status(400).json({ error: `En fazla ${MAX_PROFILES} profil oluşturabilirsiniz.` })
    return
  }

  const profileId = uuid()
  dbRun('INSERT INTO profiles (id, user_id, name, avatar, is_kids) VALUES (?, ?, ?, ?, ?)', [
    profileId, req.auth!.userId, name.trim(), avatar, isKids ? 1 : 0,
  ])

  const user = getUserWithProfiles(req.auth!.userId)!
  res.status(201).json({ user, profile: user.profiles.find((p) => p.id === profileId) })
})

router.patch('/profiles/:id', requireAuth, (req: AuthRequest, res) => {
  const profile = dbGet<ProfileRow>('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.auth!.userId,
  ])
  if (!profile) {
    res.status(404).json({ error: 'Profil bulunamadı.' })
    return
  }

  const name = req.body.name !== undefined ? String(req.body.name).trim() : profile.name
  const avatar = req.body.avatar !== undefined ? String(req.body.avatar) : profile.avatar
  const isKids = req.body.isKids !== undefined ? (req.body.isKids ? 1 : 0) : profile.is_kids

  if (!name) {
    res.status(400).json({ error: 'Profil adı gerekli.' })
    return
  }

  dbRun('UPDATE profiles SET name = ?, avatar = ?, is_kids = ? WHERE id = ?', [
    name,
    avatar,
    isKids,
    profile.id,
  ])

  const user = getUserWithProfiles(req.auth!.userId)!
  res.json({ user, profile: user.profiles.find((entry) => entry.id === profile.id) })
})

router.delete('/profiles/:id', requireAuth, (req: AuthRequest, res) => {
  const profile = dbGet<ProfileRow>('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.auth!.userId,
  ])
  if (!profile) {
    res.status(404).json({ error: 'Profil bulunamadı.' })
    return
  }

  const count = dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM profiles WHERE user_id = ?',
    [req.auth!.userId],
  )
  if ((count?.count ?? 0) <= 1) {
    res.status(400).json({ error: 'Son profili silemezsiniz.' })
    return
  }

  dbRun('DELETE FROM profiles WHERE id = ?', [profile.id])
  const user = getUserWithProfiles(req.auth!.userId)!
  res.json({ user })
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

router.post('/forgot-password', authForgotPasswordLimiter, async (req, res) => {
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
    ...(allowDevSecretLeaks() && result.devMode ? { devResetUrl: result.resetUrl } : {}),
  })
})

router.post('/reset-password', authResetPasswordLimiter, (req, res) => {
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

router.post('/verify-email', (req, res) => {
  const token = String(req.body.token ?? req.query?.token ?? '').trim()
  if (!token) {
    res.status(400).json({ error: 'Doğrulama bağlantısı geçersiz.' })
    return
  }

  const record = dbGet<{ user_id: string; expires_at: string; used: number }>(
    'SELECT user_id, expires_at, used FROM email_verification_tokens WHERE token = ?',
    [token],
  )

  if (!record || record.used || new Date(record.expires_at) < new Date()) {
    res.status(400).json({ error: 'Geçersiz veya süresi dolmuş doğrulama bağlantısı.' })
    return
  }

  dbRun('UPDATE users SET email_verified = 1 WHERE id = ?', [record.user_id])
  dbRun('UPDATE email_verification_tokens SET used = 1 WHERE token = ?', [token])

  res.json({ message: 'E-posta adresin doğrulandı. Artık giriş yapabilirsin.' })
})

router.post('/resend-verification', async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase()
  if (!email) {
    res.status(400).json({ error: 'E-posta gerekli.' })
    return
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE email = ?', [email])
  if (!user || isEmailVerified(user) || user.role !== 'user') {
    res.json({
      message: 'Kayıtlı ve doğrulanmamış bir hesap varsa doğrulama e-postası gönderildi.',
    })
    return
  }

  const emailResult = await createEmailVerificationToken(user.id, user.email)
  res.json({
    message: 'Doğrulama e-postası gönderildi.',
    ...(allowDevSecretLeaks() && emailResult.devMode ? { devVerifyUrl: emailResult.verifyUrl } : {}),
  })
})

router.post('/upload/avatar', requireAuth, avatarUpload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Dosya gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({ url, filename: req.file.filename })
})

export default router
