import { Router } from 'express'
import { sendContactEmail } from '../services/email.js'

const router = Router()

const VALID_SUBJECTS = new Set(['oneri', 'istek', 'sikayet', 'diger'])

router.post('/', async (req, res) => {
  const name = String(req.body.name ?? '').trim()
  const email = String(req.body.email ?? '').trim()
  const subject = String(req.body.subject ?? '').trim()
  const message = String(req.body.message ?? '').trim()

  if (!name || name.length < 2) {
    res.status(400).json({ error: 'Ad en az 2 karakter olmalı.' })
    return
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' })
    return
  }

  if (!VALID_SUBJECTS.has(subject)) {
    res.status(400).json({ error: 'Geçerli bir konu seçin.' })
    return
  }

  if (!message || message.length < 10) {
    res.status(400).json({ error: 'Mesaj en az 10 karakter olmalı.' })
    return
  }

  try {
    await sendContactEmail({ name, email, subject, message })
    res.json({ message: 'Mesajınız alındı. En kısa sürede size dönüş yapacağız.' })
  } catch {
    res.status(500).json({ error: 'Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.' })
  }
})

export default router
