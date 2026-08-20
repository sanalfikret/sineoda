import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { dbGet, dbRun } from '../db.js'
import { signToken } from '../middleware/auth.js'
import { mapUser } from '../mappers.js'
import type { UserRow } from '../types.js'

const router = Router()

const LEGAL_VERSION = '2026-08-20'

function mapCreatorUser(user: UserRow) {
  const creator = dbGet<{
    id: string
    studio_name: string
    bio: string
    status: string
    legal_accepted_at: string | null
    created_at: string
    program?: string
    school_id?: string | null
  }>('SELECT id, studio_name, bio, status, legal_accepted_at, created_at, program, school_id FROM creators WHERE user_id = ?', [user.id])

  return {
    ...mapUser(user, []),
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
        }
      : null,
  }
}

router.post('/signup', (req, res) => {
  const { name, email, password, studioName, bio, acceptLegal, program, schoolId, phone, projectCrew, studentIdFileUrl } = req.body as {
    name?: string
    email?: string
    password?: string
    studioName?: string
    bio?: string
    acceptLegal?: boolean
    program?: string
    schoolId?: string
    phone?: string
    projectCrew?: string
    studentIdFileUrl?: string
  }

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: 'Geçerli ad, e-posta ve en az 6 karakterli şifre gerekli.' })
    return
  }

  if (!studioName?.trim()) {
    res.status(400).json({ error: 'Stüdyo / yapım adı zorunludur.' })
    return
  }

  if (!acceptLegal) {
    res.status(400).json({ error: 'Yasal şartları ve sorumluluk beyanını kabul etmelisiniz.' })
    return
  }

  const creatorProgram = program === 'student_cinema' ? 'student_cinema' : 'standard'
  let resolvedSchoolId: string | null = null

  if (creatorProgram === 'student_cinema') {
    const normalizedPhone = String(phone ?? '').replace(/\s+/g, '').trim()
    if (!/^(\+90|0)?5\d{9}$/.test(normalizedPhone.replace(/^\+90/, '0'))) {
      res.status(400).json({ error: 'Geçerli bir cep telefonu numarası girin.' })
      return
    }

    if (!String(projectCrew ?? '').trim()) {
      res.status(400).json({ error: 'Yönetmen ve yapım ekibi bilgisi zorunludur.' })
      return
    }

    if (!String(studentIdFileUrl ?? '').trim()) {
      res.status(400).json({ error: 'Öğrenci kimliği yüklemeniz zorunludur.' })
      return
    }

    const school = schoolId
      ? dbGet<{ id: string }>('SELECT id FROM film_schools WHERE id = ? AND status = ?', [
          String(schoolId).trim(),
          'active',
        ])
      : null
    if (!school) {
      res.status(400).json({ error: 'Genç Sinema başvurusu için geçerli bir okul seçmelisiniz.' })
      return
    }
    resolvedSchoolId = school.id
  }

  const normalizedEmail = email.trim().toLowerCase()
  const exists = dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail])
  if (exists) {
    res.status(409).json({ error: 'Bu e-posta adresi zaten kayıtlı.' })
    return
  }

  const userId = uuid()
  const creatorId = uuid()
  const hash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()
  const normalizedPhone =
    creatorProgram === 'student_cinema'
      ? String(phone ?? '')
          .replace(/\s+/g, '')
          .replace(/^\+90/, '0')
          .replace(/^0(\d{10})$/, '+90$1')
      : null

  dbRun(
    'INSERT INTO users (id, name, email, password_hash, role, created_at, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, name.trim(), normalizedEmail, hash, 'creator', now, normalizedPhone],
  )
  dbRun(
    'INSERT INTO creators (id, user_id, studio_name, bio, status, legal_accepted_at, created_at, program, school_id, project_crew) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      creatorId,
      userId,
      studioName.trim(),
      bio?.trim() ?? '',
      'pending',
      now,
      now,
      creatorProgram,
      resolvedSchoolId,
      creatorProgram === 'student_cinema' ? String(projectCrew).trim() : '',
    ],
  )

  if (creatorProgram === 'student_cinema' && studentIdFileUrl?.trim()) {
    dbRun(
      'INSERT INTO creator_documents (id, creator_id, doc_type, file_url, uploaded_at) VALUES (?, ?, ?, ?, ?)',
      [uuid(), creatorId, 'student_id', studentIdFileUrl.trim(), now],
    )
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [userId])!
  const publicUser = mapCreatorUser(user)
  const token = signToken({ userId, role: 'creator' })
  res.status(201).json({ token, user: publicUser, legalVersion: LEGAL_VERSION })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'E-posta ve şifre gerekli.' })
    return
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()])
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'E-posta veya şifre hatalı.' })
    return
  }

  if (user.role !== 'creator') {
    res.status(403).json({ error: 'Bu hesap yapımcı hesabı değil. Yapımcı kaydı için kayıt olun.' })
    return
  }

  const publicUser = mapCreatorUser(user)
  const token = signToken({ userId: user.id, role: user.role })
  res.json({ token, user: publicUser })
})

export default router
