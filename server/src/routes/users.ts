import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapUser } from '../mappers.js'
import type { ProfileRow, UserRow } from '../types.js'

const router = Router()

function getUsersWithProfiles() {
  const users = dbAll<UserRow>('SELECT * FROM users ORDER BY name COLLATE NOCASE ASC')
  return users.map((user) => {
    const profiles = dbAll<ProfileRow>('SELECT * FROM profiles WHERE user_id = ?', [user.id])
    return mapUser(user, profiles)
  })
}

router.get('/', requireAdmin, (_req: AuthRequest, res) => {
  res.json({ users: getUsersWithProfiles() })
})

router.post('/', requireAdmin, (req: AuthRequest, res) => {
  const { name, email, password, role } = req.body as {
    name?: string
    email?: string
    password?: string
    role?: 'user' | 'admin'
  }

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: 'Ad, e-posta ve en az 6 karakterli şifre gerekli.' })
    return
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail])) {
    res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' })
    return
  }

  const userId = uuid()
  const userRole = role === 'admin' ? 'admin' : 'user'
  dbRun(
    'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, name.trim(), normalizedEmail, bcrypt.hashSync(password, 10), userRole, new Date().toISOString()],
  )

  if (userRole === 'user') {
    dbRun('INSERT INTO profiles (id, user_id, name, avatar, is_kids) VALUES (?, ?, ?, ?, ?)', [
      uuid(), userId, 'Ana Profil', '🎬', 0,
    ])
  }

  res.status(201).json({ user: getUsersWithProfiles().find((entry) => entry.id === userId)! })
})

router.patch('/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' })
    return
  }

  const { name, email, password, role } = req.body as {
    name?: string
    email?: string
    password?: string
    role?: 'user' | 'admin'
  }

  if (name !== undefined) dbRun('UPDATE users SET name = ? WHERE id = ?', [name.trim(), req.params.id])

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase()
    if (dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [normalizedEmail, req.params.id])) {
      res.status(409).json({ error: 'Bu e-posta başka bir hesapta kullanılıyor.' })
      return
    }
    dbRun('UPDATE users SET email = ? WHERE id = ?', [normalizedEmail, req.params.id])
  }

  if (password) {
    if (password.length < 6) {
      res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' })
      return
    }
    dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [
      bcrypt.hashSync(password, 10),
      req.params.id,
    ])
  }

  if (role !== undefined) {
    dbRun('UPDATE users SET role = ? WHERE id = ?', [role === 'admin' ? 'admin' : 'user', req.params.id])
  }

  res.json({ user: getUsersWithProfiles().find((entry) => entry.id === req.params.id)! })
})

router.delete('/:id', requireAdmin, (req: AuthRequest, res) => {
  if (req.auth!.userId === req.params.id) {
    res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz.' })
    return
  }

  const existing = dbGet('SELECT id FROM users WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' })
    return
  }

  dbRun('DELETE FROM profiles WHERE user_id = ?', [req.params.id])
  dbRun('DELETE FROM users WHERE id = ?', [req.params.id])
  res.status(204).send()
})

export default router
