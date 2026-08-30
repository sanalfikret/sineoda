import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { v4 as uuid } from 'uuid'
import { config, publicAssetUrl } from '../config.js'
import { dbGet, dbRun, uploadsDir } from '../db.js'
import { createIyzicoCheckout, retrieveIyzicoCheckout } from '../services/iyzico.js'
import { createPaytrToken, verifyPaytrCallback } from '../services/paytr.js'
import { getBillingPlans } from '../services/billingPlansConfig.js'
import { BRAND_NAME } from '../constants/brand.js'
import { getCreatorRegistrationPlanId, getPlan, isCreatorApplicationPlan, normalizePlanId, planRequiresStudentId } from '../services/plans.js'
import { activateCreatorRegistration } from '../services/creatorRegistration.js'
import { canUserPlay, getUserSubscription, isSubscriptionRequired } from '../services/subscription.js'
import { activateUserSubscription } from '../services/subscriptionActivation.js'
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
    'SELECT subscription_status, subscription_plan, subscription_started_at, subscription_expires_at, role FROM users WHERE id = ?',
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
    user?.subscription_status === 'active' && isExpired ? 'expired' : (user?.subscription_status ?? 'free')

  res.json({
    status,
    plan: user?.subscription_plan ?? null,
    startedAt,
    expiresAt,
    canPlay: canUserPlay(user),
    paymentRequired: isSubscriptionRequired(),
  })
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
    if (normalizedPlanId !== expectedPlanId) {
      res.status(400).json({ error: 'Bu başvuru ücreti hesap türünüz için geçerli değil.' })
      return
    }
    if (creator.registration_paid_at) {
      res.status(400).json({ error: 'Yapımcı başvuru ücreti zaten ödendi.' })
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
    if (isCreatorApplicationPlan(normalizedPlanId)) {
      const { paidAt } = activateCreatorRegistration(user.id)
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
      activateCreatorRegistration(order.user_id)
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
      activateCreatorRegistration(order.user_id)
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
