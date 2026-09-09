import { dbGet, dbRun, dbTransaction } from '../db.js'
import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { broadcastMessage, sendMessageToUser } from '../services/userMessages.js'

const router = Router()
function once<T>(adminId: string, requestId: unknown, payload: unknown, send: () => T): T {
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{20,64}$/.test(requestId)) {
    throw new Error('Sayfayı yenileyip tekrar deneyin. Gönderim kimliği eksik.')
  }
  const serialized = JSON.stringify(payload)
  let result!: T
  dbTransaction(() => {
    const old = dbGet<{payload: string; result: string}>(
      'SELECT payload, result FROM admin_message_requests WHERE admin_id = ? AND request_id = ?', [adminId, requestId])
    if (old) {
      if (old.payload !== serialized) throw new Error('Bu gönderim kimliği farklı bir mesaj için kullanılmış.')
      result = JSON.parse(old.result)
      return
    }
    result = send()
    dbRun('INSERT INTO admin_message_requests VALUES (?, ?, ?, ?, ?)',
      [adminId, requestId, serialized, JSON.stringify(result), new Date().toISOString()])
  })
  return result
}

router.post('/broadcast', requireAdmin, (req: AuthRequest, res) => {
  const { subject, body, audience } = req.body as {
    subject?: string
    body?: string
    audience?: 'all' | 'active_subscribers'
  }

  try {
    const result = once(req.auth!.userId, req.body.requestId, { subject, body, audience }, () => broadcastMessage({
      subject: String(subject ?? ''),
      body: String(body ?? ''),
      sentByAdminId: req.auth!.userId,
      audience: audience === 'active_subscribers' ? 'active_subscribers' : 'all',
    }))
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Toplu mesaj gönderilemedi.' })
  }
})

router.post('/users/:userId', requireAdmin, (req: AuthRequest, res) => {
  const { subject, body } = req.body as { subject?: string; body?: string }

  try {
    const message = once(req.auth!.userId, req.body.requestId, { userId: req.params.userId, subject, body }, () => sendMessageToUser({
      userId: req.params.userId,
      subject: String(subject ?? ''),
      body: String(body ?? ''),
      sentByAdminId: req.auth!.userId,
    }))
    res.status(201).json({ message })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Mesaj gönderilemedi.' })
  }
})

export default router
