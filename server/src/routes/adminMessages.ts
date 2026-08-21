import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { broadcastMessage, sendMessageToUser } from '../services/userMessages.js'

const router = Router()

router.post('/broadcast', requireAdmin, (req: AuthRequest, res) => {
  const { subject, body, audience } = req.body as {
    subject?: string
    body?: string
    audience?: 'all' | 'active_subscribers'
  }

  try {
    const result = broadcastMessage({
      subject: String(subject ?? ''),
      body: String(body ?? ''),
      sentByAdminId: req.auth!.userId,
      audience: audience === 'active_subscribers' ? 'active_subscribers' : 'all',
    })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Toplu mesaj gönderilemedi.' })
  }
})

router.post('/users/:userId', requireAdmin, (req: AuthRequest, res) => {
  const { subject, body } = req.body as { subject?: string; body?: string }

  try {
    const message = sendMessageToUser({
      userId: req.params.userId,
      subject: String(subject ?? ''),
      body: String(body ?? ''),
      sentByAdminId: req.auth!.userId,
    })
    res.status(201).json({ message })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Mesaj gönderilemedi.' })
  }
})

export default router
