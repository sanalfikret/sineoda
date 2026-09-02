import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { v4 as uuid } from 'uuid'
import { config, publicAssetUrl } from '../config.js'
import { dbGet, dbRun, dbAll, uploadsDir } from '../db.js'
import { createIyzicoCheckout, retrieveIyzicoCheckout } from '../services/iyzico.js'
import { createPaytrToken, verifyPaytrCallback } from '../services/paytr.js'
import { getBillingPlans } from '../services/billingPlansConfig.js'
import { BRAND_NAME } from '../constants/brand.js'
import { getCreatorRegistrationPlanId, getPlan, isCreatorApplicationPlan, isBuiltInCreatorApplicationPlan, normalizePlanId, planRequiresStudentId } from '../services/plans.js'
import { activateCreatorRegistration } from '../services/creatorRegistration.js'
import { canUserPlay, getUserSubscription, isSubscriptionRequired } from '../services/subscription.js'
import { activateUserSubscription } from '../services/subscriptionActivation.js'
import { cancelUserSubscription } from '../services/subscriptionCancellation.js'
import { redeemGiftCode } from '../services/giftCodes.js'
import { requireAuth, getCreatorForUser, type AuthRequest } from '../middleware/auth.js'
import type { UserRow } from '../types.js'

const router = Router()

const studentIdUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `${uuid()}${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf'
    if (allowed) cb(null, true)
    else cb(new Error('Öğrenci kimliği yalnızca görsel veya PDF olarak yüklenebilir.'))
  },
})

function getClientIp(req: { headers: Record<string, unknown>; socket: { remoteAddress?: string } }) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || '127.0.0.1'
  return req.socket.remoteAddress?.replace('::ffff:', '') || '127.0.0.1'
}

router.get('/plans', (_req, res) => {
  res.json({
    plans: getBillingPlans(),
    providers: {
      paytr: config.isPaytrConfigured(),
      iyzico: config.isIyzicoConfigured(),
      default: config.paymentProvider,
      paymentRequired: isSubscriptionRequired(),
      paymentReady: config.isPaymentConfigured(),
    },
  })
})

router.get('/can-play', requireAuth, (req: AuthRequest, res) => {
  const user = getUserSubscription(req.auth!.userId)
  res.json({
    allowed: canUserPlay(user),
    paymentRequired: isSubscriptionRequired(),
  })
})

router.get('/subscription', requireAuth, (req: AuthRequest, res) => {
  const user = dbGet<UserRow>(
    'SELECT role, subscription_status, subscription_plan, subscription_started_at, subscription_expires_at, subscription_cancelled_at FROM users WHERE id = ?',
    [req.auth!.userId],
  )

  let startedAt = user?.subscription_started_at ?? null
  if (!startedAt) {
    const order = dbGet<{ completed_at: string | null }>(
      "SELECT completed_at FROM payment_orders WHERE user_id = ? AND status = 'paid' ORDER BY completed_at DESC LIMIT 1",
      [req.auth!.userId],
    )
    startedAt = order?.completed_at ?? null
  }

  const expiresAt = user?.subscription_expires_at ?? null
  const isExpired = Boolean(expiresAt && new Date(expiresAt) < new Date())
  const status =
    user?.subscription_status === 'active' && isExpired
      ? 'expired'
      : user?.subscription_status === 'cancelled' && isExpired
        ? 'expired'
        : (user?.subscription_status ?? 'free')

  res.json({
    status,
    plan: user?.subscription_plan ?? null,
    startedAt,
    expiresAt,
    cancelledAt: user?.subscription_cancelled_at ?? null,
    canPlay: canUserPlay(user),
    paymentRequired: isSubscriptionRequired(),
    canCancel: user?.role === 'user' && user?.subscription_status === 'active',
  })
})

router.get('/invoices', requireAuth, (req: AuthRequest, res) => {
  const rows = dbAll<{
    id: string
    plan_id: string
    provider: string
    amount: number
    status: string
    merchant_oid: string
    created_at: string
    completed_at: string | null
  }>(
    `SELECT id, plan_id, provider, amount, status, merchant_oid, created_at, completed_at
     FROM payment_orders
     WHERE user_id = ? AND status = 'paid'
     ORDER BY completed_at DESC, created_at DESC`,
    [req.auth!.userId],
  )

  const plans = getBillingPlans()
  res.json({
    invoices: rows.map((row) => {
      const plan = plans.find((entry) => entry.id === row.plan_id)
      return {
        id: row.id,
        merchantOid: row.merchant_oid,
        planId: row.plan_id,
        planName: plan?.name ?? row.plan_id,
        provider: row.provider,
        amountTl: Math.round(row.amount / 100),
        paidAt: row.completed_at ?? row.created_at,
        status: row.status,
      }
    }),
  })
})

router.get('/invoices/:id/receipt', requireAuth, (req: AuthRequest, res) => {
  const row = dbGet<{
    id: string
    user_id: string
    plan_id: string
    provider: string
    amount: number
    merchant_oid: string
    completed_at: string | null
    created_at: string
  }>(
    `SELECT id, user_id, plan_id, provider, amount, merchant_oid, completed_at, created_at
     FROM payment_orders WHERE id = ? AND user_id = ? AND status = 'paid'`,
    [req.params.id, req.auth!.userId],
  )

  if (!row) {
    res.status(404).send('Makbuz bulunamadı.')
    return
  }

  const plan = getBillingPlans().find((entry) => entry.id === row.plan_id)
  const paidAt = row.completed_at ?? row.created_at
  const amountTl = Math.round(row.amount / 100)
  const paidLabel = new Date(paidAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>${BRAND_NAME} Makbuz — ${row.merchant_oid}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .muted { color: #555; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
    td { padding: 0.5rem 0; border-bottom: 1px solid #eee; vertical-align: top; }
    td:first-child { color: #555; width: 38%; }
    .note { margin-top: 1.5rem; font-size: 0.85rem; color: #666; line-height: 1.5; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>${BRAND_NAME}</h1>
  <p class="muted">Platform ödeme makbuzu</p>
  <table>
    <tr><td>Plan</td><td>${plan?.name ?? row.plan_id}</td></tr>
    <tr><td>Tutar</td><td>₺${amountTl.toLocaleString('tr-TR')}</td></tr>
    <tr><td>Ödeme tarihi</td><td>${paidLabel}</td></tr>
    <tr><td>Referans</td><td><code>${row.merchant_oid}</code></td></tr>
    <tr><td>Ödeme yöntemi</td><td>${row.provider.toUpperCase()}</td></tr>
  </table>
  <p class="note">Bu belge PayTR üzerinden alınan ödemenin platform makbuzudur. Resmi e-fatura ayrı muhasebe sürecinde düzenlenir.</p>
  <p><button type="button" onclick="window.print()">Yazdır / PDF kaydet</button></p>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.post('/subscription/cancel', requireAuth, (req: AuthRequest, res) => {
  try {
    const result = cancelUserSubscription(req.auth!.userId)
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Abonelik iptal edilemedi.' })
  }
})

router.post('/student-id', requireAuth, studentIdUpload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Öğrenci kimliği dosyası gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  dbRun('UPDATE users SET student_id_url = ? WHERE id = ?', [url, req.auth!.userId])
  res.status(201).json({ url })
})

router.post('/redeem-gift-code', requireAuth, (req: AuthRequest, res) => {
  try {
    const result = redeemGiftCode(req.auth!.userId, String(req.body.code ?? ''))
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Kupon kullanılamadı.' })
  }
})

router.post('/checkout', requireAuth, async (req: AuthRequest, res) => {
  const planId = String(req.body.planId ?? '')
  const provider = String(req.body.provider ?? config.paymentProvider) as 'paytr' | 'iyzico'
  const normalizedPlanId = normalizePlanId(planId)
  const plan = getPlan(planId)

  if (!normalizedPlanId || !plan || plan.enabled === false) {
    res.status(400).json({ error: 'Geçersiz plan.' })
    return
  }

  const user = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [req.auth!.userId])
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' })
    return
  }

  if (isCreatorApplicationPlan(normalizedPlanId)) {
    if (user.role !== 'creator') {
      res.status(403).json({ error: 'Yapımcı başvuru ücreti yalnızca yapımcı hesapları için geçerlidir.' })
      return
    }
    const creator = getCreatorForUser(user.id)
    if (!creator) {
      res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
      return
    }
    const expectedPlanId = getCreatorRegistrationPlanId(
      (creator.program ?? 'standard') as 'standard' | 'student_cinema',
    )
    if (isBuiltInCreatorApplicationPlan(normalizedPlanId) && normalizedPlanId !== expectedPlanId) {
      res.status(400).json({ error: 'Bu başvuru ücreti hesap türünüz için geçerli değil.' })
      return
    }
    const creatorPlanInterval = plan?.interval ?? 'once'
    if (creatorPlanInterval === 'once' && creator.registration_paid_at) {
      res.status(400).json({ error: 'Yapımcı başvuru ücreti zaten ödendi.' })
      return
    }
    if (
      creatorPlanInterval !== 'once' &&
      creator.registration_paid_at &&
      user.subscription_expires_at &&
      new Date(user.subscription_expires_at) > new Date()
    ) {
      res.status(400).json({ error: 'Yapımcı üyeliğiniz hâlâ aktif.' })
      return
    }
  } else if (user.role === 'creator') {
    res.status(403).json({ error: 'Yapımcı hesapları izleyici abonelik planı satın alamaz.' })
    return
  }

  if (planRequiresStudentId(normalizedPlanId) && !user.student_id_url) {
    res.status(400).json({
      error: 'Öğrenci planı için öğrenci kimliği yüklemeniz gerekir.',
      code: 'STUDENT_ID_REQUIRED',
    })
    return
  }

  dbRun('UPDATE users SET pending_plan_id = ? WHERE id = ?', [normalizedPlanId, user.id])

  if (!config.isPaymentConfigured()) {
    if (!config.isProduction) {
      if (isCreatorApplicationPlan(normalizedPlanId)) {
        const { paidAt } = activateCreatorRegistration(user.id, normalizedPlanId)
        res.json({
          message: 'Demo modu: yapımcı başvuru ücreti otomatik onaylandı.',
          demoMode: true,
          paidAt,
        })
        return
      }
      const { startedAt, expiresAt } = activateUserSubscription(user.id, normalizedPlanId)
      res.json({
        message: 'Demo modu: ödeme sağlayıcısı yapılandırılmadı, abonelik otomatik aktif edildi.',
        demoMode: true,
        startedAt,
        expiresAt,
      })
      return
    }
    res.status(503).json({
      error: 'Ödeme sistemi henüz aktif değil. PayTR entegrasyonu tamamlandığında tekrar deneyin.',
      code: 'PAYMENT_NOT_READY',
    })
    return
  }

  const orderId = uuid()
  const merchantOid = `sineoda-${orderId}`
  const amountKurus = plan.price * 100

  dbRun(
    `INSERT INTO payment_orders (id, user_id, plan_id, provider, amount, status, merchant_oid, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [orderId, user.id, normalizedPlanId, provider, amountKurus, merchantOid, new Date().toISOString()],
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
      basket: [[`${BRAND_NAME} ${plan.name}`, plan.price.toFixed(2), 1]],
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
    buyerName: firstName || BRAND_NAME,
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
    if (isCreatorApplicationPlan(order.plan_id)) {
      activateCreatorRegistration(order.user_id, order.plan_id)
    } else {
      activateUserSubscription(order.user_id, order.plan_id)
    }
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
    if (isCreatorApplicationPlan(order.plan_id)) {
      activateCreatorRegistration(order.user_id, order.plan_id)
    } else {
      activateUserSubscription(order.user_id, order.plan_id)
    }
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
