import { Router } from 'express'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'
import { dbGet } from '../db.js'
import type { UserRow } from '../types.js'
import {
  countUnreadMessages,
  listUserMessages,
  markMessageRead,
} from '../services/userMessages.js'

const router = Router()

router.get('/', requireAuth, (req: AuthRequest, res) => {
  const user = dbGet<UserRow>('SELECT role FROM users WHERE id = ?', [req.auth!.userId])
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' })
    return
  }
  if (user.role === 'admin' || user.role === 'manager' || user.role === 'creator') {
    res.status(403).json({ error: 'Mesajlar yalnızca izleyici (üye) hesapları için.' })
    return
  }

  res.json({ messages: listUserMessages(req.auth!.userId) })
})

router.get('/unread-count', requireAuth, (req: AuthRequest, res) => {
  const user = dbGet<UserRow>('SELECT role FROM users WHERE id = ?', [req.auth!.userId])
  if (!user || user.role === 'admin' || user.role === 'manager' || user.role === 'creator') {
    res.json({ count: 0 })
    return
  }

  res.json({ count: countUnreadMessages(req.auth!.userId) })
})

router.patch('/:id/read', requireAuth, (req: AuthRequest, res) => {
  try {
    const message = markMessageRead(req.auth!.userId, req.params.id)
    res.json({ message })
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Mesaj bulunamadı.' })
  }
})

export default router
