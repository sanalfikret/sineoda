import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { config } from '../config.js'
import { dbGet, dbRun } from '../db.js'
import { createIyzicoCheckout, retrieveIyzicoCheckout } from '../services/iyzico.js'
import { createPaytrToken, verifyPaytrCallback } from '../services/paytr.js'
import { BILLING_PLANS, getPlan, planExpiry } from '../services/plans.js'
import { canUserPlay, getUserSubscription } from '../services/subscription.js'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'
import type { UserRow } from '../types.js'

const router = Router()

function getClientIp(req: { headers: Record<string, unknown>; socket: { remoteAddress?: string } }) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || '127.0.0.1'
  return req.socket.remoteAddress?.replace('::ffff:', '') || '127.0.0.1'
}

router.get('/plans', (_req, res) => {
  res.json({
    plans: BILLING_PLANS,
    providers: {
      paytr: config.isPaytrConfigured(),
      iyzico: config.isIyzicoConfigured(),
      default: config.paymentProvider,
      paymentRequired: config.isPaymentConfigured() && config.requireSubscription,
    },
  })
})

router.get('/can-play', requireAuth, (req: AuthRequest, res) => {
  const user = getUserSubscription(req.auth!.userId)
  res.json({
    allowed: canUserPlay(user),
    paymentRequired: config.isPaymentConfigured() && config.requireSubscription,
  })
})

router.get('/subscription', requireAuth, (req: AuthRequest, res) => {
  const user = dbGet<UserRow>(
    'SELECT subscription_status, subscription_plan, subscription_expires_at, role FROM users WHERE id = ?',
    [req.auth!.userId],
  )

  res.json({
    status: user?.subscription_status ?? 'free',
    plan: user?.subscription_plan ?? null,
    expiresAt: user?.subscription_expires_at ?? null,
    canPlay: canUserPlay(user),
    paymentRequired: config.isPaymentConfigured() && config.requireSubscription,
  })
})

router.post('/checkout', requireAuth, async (req: AuthRequest, res) => {
  const planId = String(req.body.planId ?? '')
  const provider = String(req.body.provider ?? config.paymentProvider) as 'paytr' | 'iyzico'
  const plan = getPlan(planId)

  if (!plan) {
    res.status(400).json({ error: 'Geçersiz plan.' })
    return
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [req.auth!.userId])
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' })
    return
  }

  if (!config.isPaymentConfigured()) {
    const expiresAt = planExpiry(planId)
    dbRun(
      'UPDATE users SET subscription_status = ?, subscription_plan = ?, subscription_expires_at = ? WHERE id = ?',
      ['active', planId, expiresAt, user.id],
    )
    res.json({
      message: 'Demo modu: ödeme sağlayıcısı yapılandırılmadı, abonelik otomatik aktif edildi.',
      demoMode: true,
      expiresAt,
    })
    return
  }

  const orderId = uuid()
  const merchantOid = `sineoda-${orderId}`
  const amountKurus = plan.price * 100

  dbRun(
    `INSERT INTO payment_orders (id, user_id, plan_id, provider, amount, status, merchant_oid, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [orderId, user.id, planId, provider, amountKurus, merchantOid, new Date().toISOString()],
  )

  if (provider === 'paytr') {
    if (!config.isPaytrConfigured()) {
      res.status(400).json({ error: 'PayTR yapılandırılmamış.' })
      return
    }

    const tokenResult = await createPaytrToken({
      email: user.email,
      userName: user.name,
      userPhone: '05555555555',
      userAddress: 'Turkiye',
      merchantOid,
      amountKurus,
      basket: [[`Sineoda ${plan.name}`, plan.price.toFixed(2), 1]],
      userIp: getClientIp(req),
    })

    if (tokenResult.status !== 'success' || !tokenResult.token) {
      res.status(502).json({ error: tokenResult.reason || 'PayTR token alınamadı.' })
      return
    }

    res.json({
      provider: 'paytr',
      token: tokenResult.token,
      iframeUrl: `https://www.paytr.com/odeme/guvenli/${tokenResult.token}`,
    })
    return
  }

  if (!config.isIyzicoConfigured()) {
    res.status(400).json({ error: 'iyzico yapılandırılmamış.' })
    return
  }

  const [firstName, ...rest] = user.name.split(' ')
  const iyzicoResult = await createIyzicoCheckout({
    userId: user.id,
    planName: plan.name,
    price: plan.price.toFixed(2),
    buyerName: firstName || 'Sineoda',
    buyerSurname: rest.join(' ') || 'Uye',
    email: user.email,
    merchantOid,
  })

  if (iyzicoResult.status !== 'success' || !iyzicoResult.paymentPageUrl) {
    res.status(502).json({ error: iyzicoResult.errorMessage || 'iyzico ödeme başlatılamadı.' })
    return
  }

  res.json({
    provider: 'iyzico',
    paymentPageUrl: iyzicoResult.paymentPageUrl,
    token: iyzicoResult.token,
  })
})

router.post('/callback/paytr', (req, res) => {
  const payload = req.body as {
    merchant_oid?: string
    status?: string
    total_amount?: string
    hash?: string
  }

  if (
    !payload.merchant_oid ||
    !payload.status ||
    !payload.total_amount ||
    !payload.hash ||
    !verifyPaytrCallback({
      merchant_oid: payload.merchant_oid,
      status: payload.status,
      total_amount: payload.total_amount,
      hash: payload.hash,
    })
  ) {
    res.send('OK')
    return
  }

  const order = dbGet<{ id: string; user_id: string; plan_id: string; status: string }>(
    'SELECT id, user_id, plan_id, status FROM payment_orders WHERE merchant_oid = ?',
    [payload.merchant_oid],
  )

  if (!order || order.status === 'paid') {
    res.send('OK')
    return
  }

  if (payload.status === 'success') {
    dbRun("UPDATE payment_orders SET status = 'paid', completed_at = ? WHERE id = ?", [
      new Date().toISOString(),
      order.id,
    ])
    dbRun(
      'UPDATE users SET subscription_status = ?, subscription_plan = ?, subscription_expires_at = ? WHERE id = ?',
      ['active', order.plan_id, planExpiry(order.plan_id), order.user_id],
    )
  } else {
    dbRun("UPDATE payment_orders SET status = 'failed', completed_at = ? WHERE id = ?", [
      new Date().toISOString(),
      order.id,
    ])
  }

  res.send('OK')
})

router.post('/callback/iyzico', async (req, res) => {
  const token = String(req.body.token ?? '')
  if (!token) {
    res.redirect(`${config.frontendUrl}/odeme/basarisiz`)
    return
  }

  const result = await retrieveIyzicoCheckout(token)
  const order = dbGet<{ id: string; user_id: string; plan_id: string; status: string }>(
    'SELECT id, user_id, plan_id, status FROM payment_orders WHERE merchant_oid = ?',
    [result.basketId ?? ''],
  )

  if (order && result.paymentStatus === 'SUCCESS' && order.status !== 'paid') {
    dbRun("UPDATE payment_orders SET status = 'paid', completed_at = ? WHERE id = ?", [
      new Date().toISOString(),
      order.id,
    ])
    dbRun(
      'UPDATE users SET subscription_status = ?, subscription_plan = ?, subscription_expires_at = ? WHERE id = ?',
      ['active', order.plan_id, planExpiry(order.plan_id), order.user_id],
    )
    res.redirect(`${config.frontendUrl}/odeme/basarili`)
    return
  }

  if (order) {
    dbRun("UPDATE payment_orders SET status = 'failed', completed_at = ? WHERE id = ?", [
      new Date().toISOString(),
      order.id,
    ])
  }

  res.redirect(`${config.frontendUrl}/odeme/basarisiz`)
})

export default router
