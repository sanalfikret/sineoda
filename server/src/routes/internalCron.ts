import { Router } from 'express'
import { config } from '../config.js'
import { ensureMonthlyRollover } from '../services/watchAccounting.js'

const router = Router()

function isLoopbackAddress(value: string | undefined) {
  if (!value) return false
  const normalized = value.replace('::ffff:', '')
  return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost'
}

function authorizeCron(req: { headers: Record<string, unknown>; ip?: string; socket: { remoteAddress?: string } }) {
  const secret = String(process.env.CRON_SECRET ?? '').trim()
  if (secret) {
    const authHeader = String(req.headers.authorization ?? '')
    return authHeader === `Bearer ${secret}`
  }

  if (!config.isProduction) {
    return true
  }

  const remote = req.ip ?? req.socket.remoteAddress
  return isLoopbackAddress(remote)
}

router.post('/watch-accounting/rollover', (req, res) => {
  if (!authorizeCron(req)) {
    res.status(401).json({ error: 'Yetkisiz cron istegi.' })
    return
  }

  try {
    const result = ensureMonthlyRollover()
    res.json({ ok: true, ...result })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Muhasebe devri basarisiz.',
    })
  }
})

export default router
