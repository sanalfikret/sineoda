import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { dbAll, dbGet, dbRun, dbTransaction, dbRunNoPersist } from '../db.js'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'
import { ensureCreatorChatTable } from '../services/creatorChat.js'

const router = Router()

router.use(requireAuth)
router.use((req: AuthRequest, res, next) => {
  if (!['admin', 'manager', 'creator'].includes(req.auth!.role)) {
    res.sendStatus(403)
    return
  }
  ensureCreatorChatTable()
  next()
})

function isAdmin(req: AuthRequest) {
  return ['admin', 'manager'].includes(req.auth!.role)
}

function requireAdminRole(req: AuthRequest, res: { sendStatus: (code: number) => void }) {
  if (isAdmin(req)) return true
  res.sendStatus(403)
  return false
}

const PROGRAM_FILTER = ['all', 'standard', 'student_cinema'] as const

/** Admin: yapımcı arama listesi (eski bileşen uyumluluğu için korunur). */
router.get('/recipients', (req: AuthRequest, res) => {
  if (!requireAdminRole(req, res)) return
  const q = '%' + String(req.query.q ?? '').slice(0, 150) + '%'
  const offset = Math.max(0, Math.floor(Number(req.query.offset) || 0))
  res.json(
    dbAll(
      `SELECT u.id, u.name, c.program,
        (SELECT COUNT(*) FROM creator_chat m WHERE m.user_id = u.id AND m.from_admin = 0 AND m.read_at IS NULL) AS unread
       FROM users u JOIN creators c ON c.user_id = u.id
       WHERE u.role = 'creator' AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY unread DESC, u.name COLLATE NOCASE, u.id LIMIT 50 OFFSET ?`,
      [q, q, offset],
    ),
  )
})

/** Admin: okunmuş / okunmamış özet (üst çubuk ve Özet sayfası). */
router.get('/summary', (req: AuthRequest, res) => {
  if (!requireAdminRole(req, res)) return
  const row = dbGet<{ total: number; unread: number; threads: number; unread_threads: number }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) AS unread,
       COUNT(DISTINCT user_id) AS threads,
       COUNT(DISTINCT CASE WHEN read_at IS NULL THEN user_id END) AS unread_threads
     FROM creator_chat WHERE from_admin = 0`,
  )
  const total = row?.total ?? 0
  const unread = row?.unread ?? 0
  res.json({ total, unread, read: total - unread, threads: row?.threads ?? 0, unreadThreads: row?.unread_threads ?? 0 })
})

/** Admin: son gelen mesajlar (Özet sayfası). */
router.get('/recent', (req: AuthRequest, res) => {
  if (!requireAdminRole(req, res)) return
  const limit = Math.min(20, Math.max(1, Math.floor(Number(req.query.limit) || 5)))
  const rows = dbAll<{
    id: string
    user_id: string
    subject: string
    body: string
    created_at: string
    read_at: string | null
    name: string
    email: string
    program: string | null
    studio_name: string | null
    photo_url: string | null
  }>(
    `SELECT m.id, m.user_id, m.subject, m.body, m.created_at, m.read_at,
            u.name, u.email, c.program, c.studio_name, c.photo_url
     FROM creator_chat m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN creators c ON c.user_id = u.id
     WHERE m.from_admin = 0
     ORDER BY m.created_at DESC, m.rowid DESC
     LIMIT ?`,
    [limit],
  )
  res.json({
    messages: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      subject: row.subject,
      body: row.body,
      createdAt: row.created_at,
      readAt: row.read_at,
      isRead: Boolean(row.read_at),
      name: row.name,
      email: row.email,
      program: row.program ?? 'standard',
      studioName: row.studio_name ?? '',
      photoUrl: row.photo_url ?? '',
    })),
  })
})

/** Admin: sohbet listesi — okunmamışlar önce, sonra son mesaja göre. */
router.get('/threads', (req: AuthRequest, res) => {
  if (!requireAdminRole(req, res)) return
  const q = '%' + String(req.query.q ?? '').slice(0, 150) + '%'
  const programRaw = String(req.query.program ?? 'all')
  const program = (PROGRAM_FILTER as readonly string[]).includes(programRaw) ? programRaw : 'all'
  const onlyUnread = String(req.query.unread ?? '') === '1'
  const offset = Math.max(0, Math.floor(Number(req.query.offset) || 0))
  const limit = 100

  const rows = dbAll<{
    id: string
    name: string
    email: string
    phone: string | null
    program: string | null
    studio_name: string | null
    photo_url: string | null
    status: string | null
    unread: number
    total: number
    last_at: string | null
    last_subject: string | null
    last_from_admin: number | null
  }>(
    `SELECT u.id, u.name, u.email, u.phone, c.program, c.studio_name, c.photo_url, c.status,
       (SELECT COUNT(*) FROM creator_chat m WHERE m.user_id = u.id AND m.from_admin = 0 AND m.read_at IS NULL) AS unread,
       (SELECT COUNT(*) FROM creator_chat m WHERE m.user_id = u.id) AS total,
       (SELECT m.created_at FROM creator_chat m WHERE m.user_id = u.id ORDER BY m.created_at DESC, m.rowid DESC LIMIT 1) AS last_at,
       (SELECT m.subject FROM creator_chat m WHERE m.user_id = u.id ORDER BY m.created_at DESC, m.rowid DESC LIMIT 1) AS last_subject,
       (SELECT m.from_admin FROM creator_chat m WHERE m.user_id = u.id ORDER BY m.created_at DESC, m.rowid DESC LIMIT 1) AS last_from_admin
     FROM users u JOIN creators c ON c.user_id = u.id
     WHERE u.role = 'creator'
       AND (u.name LIKE ? OR u.email LIKE ? OR COALESCE(c.studio_name, '') LIKE ?)
       ${program === 'all' ? '' : "AND COALESCE(c.program, 'standard') = ?"}
       ${onlyUnread ? 'AND unread > 0' : ''}
     ORDER BY (unread > 0) DESC, last_at DESC, u.name COLLATE NOCASE
     LIMIT ? OFFSET ?`,
    program === 'all' ? [q, q, q, limit, offset] : [q, q, q, program, limit, offset],
  )

  res.json({
    threads: rows.map((row) => ({
      userId: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? '',
      program: row.program ?? 'standard',
      studioName: row.studio_name ?? '',
      photoUrl: row.photo_url ?? '',
      status: row.status ?? 'pending',
      unread: row.unread,
      total: row.total,
      lastAt: row.last_at,
      lastSubject: row.last_subject,
      lastFromAdmin: row.last_from_admin === null ? null : Boolean(row.last_from_admin),
    })),
  })
})

/** Admin: bir yapımcıdan gelen tüm mesajları okundu işaretle. */
router.patch('/thread/:userId/read', (req: AuthRequest, res) => {
  if (!requireAdminRole(req, res)) return
  const userId = String(req.params.userId)
  dbRun('UPDATE creator_chat SET read_at = ? WHERE user_id = ? AND from_admin = 0 AND read_at IS NULL', [
    new Date().toISOString(),
    userId,
  ])
  res.json({ ok: true })
})

/** Sohbet mesajları (admin: userId ile; yapımcı: kendi sohbeti). */
router.get('/', (req: AuthRequest, res) => {
  const userId = isAdmin(req) ? String(req.query.userId ?? '') : req.auth!.userId
  if (!userId) {
    res.status(400).json({ error: 'Alıcı seçin.' })
    return
  }
  const before = String(req.query.before ?? '')
  const rows = dbAll(
    'SELECT * FROM creator_chat WHERE user_id = ? ' +
      (before ? 'AND rowid < (SELECT rowid FROM creator_chat WHERE id = ? AND user_id = ?) ' : '') +
      'ORDER BY rowid DESC LIMIT 50',
    before ? [userId, before, userId] : [userId],
  )
  res.json(rows.reverse())
})

router.patch('/:id/read', (req: AuthRequest, res) => {
  const row = dbGet<{ user_id: string; from_admin: number }>(
    'SELECT user_id, from_admin FROM creator_chat WHERE id = ?',
    [String(req.params.id)],
  )
  if (!row || (!isAdmin(req) && row.user_id !== req.auth!.userId) || Boolean(row.from_admin) === isAdmin(req)) {
    res.sendStatus(404)
    return
  }
  dbRun('UPDATE creator_chat SET read_at = COALESCE(read_at, ?) WHERE id = ?', [
    new Date().toISOString(),
    String(req.params.id),
  ])
  res.json({ ok: true })
})

router.post('/', (req: AuthRequest, res) => {
  const { subject, body, requestId, audience, userId } = (req.body ?? {}) as Record<string, unknown>
  if (
    typeof subject !== 'string' ||
    !subject.trim() ||
    subject.length > 200 ||
    typeof body !== 'string' ||
    !body.trim() ||
    body.length > 10000 ||
    typeof requestId !== 'string' ||
    !/^[a-zA-Z0-9-]{20,64}$/.test(requestId)
  ) {
    res.status(400).json({ error: 'Konu (200 karakter) ve mesajı (10000 karakter) kontrol edin.' })
    return
  }

  let recipients: string[] = []
  if (isAdmin(req)) {
    if (typeof audience === 'string' && ['all', 'student_cinema', 'standard'].includes(audience)) {
      recipients = dbAll<{ user_id: string }>(
        "SELECT c.user_id FROM creators c JOIN users u ON u.id = c.user_id WHERE u.role = 'creator'" +
          (audience === 'all' ? '' : " AND COALESCE(c.program, 'standard') = ?"),
        audience === 'all' ? [] : [audience],
      ).map((row) => row.user_id)
    } else if (
      audience === 'direct' &&
      typeof userId === 'string' &&
      dbGet("SELECT u.id FROM users u JOIN creators c ON c.user_id = u.id WHERE u.id = ? AND u.role = 'creator'", [userId])
    ) {
      recipients = [userId]
    } else {
      res.status(400).json({ error: 'Geçerli alıcı veya grup seçin.' })
      return
    }
  } else {
    if (!dbGet('SELECT id FROM creators WHERE user_id = ?', [req.auth!.userId])) {
      res.sendStatus(403)
      return
    }
    recipients = [req.auth!.userId]
  }

  const now = new Date().toISOString()
  dbTransaction(() => {
    for (const recipient of recipients) {
      dbRunNoPersist(
        'INSERT OR IGNORE INTO creator_chat (id, user_id, sender_id, from_admin, subject, body, created_at, request_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [randomUUID(), recipient, req.auth!.userId, isAdmin(req) ? 1 : 0, subject.trim(), body.trim(), now, requestId],
      )
    }
  })
  res.status(201).json({ sent: recipients.length })
})

export default router
