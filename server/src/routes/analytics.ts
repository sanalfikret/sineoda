import { Router } from 'express'
import { ONLINE_WINDOW_MS } from './analyticsPublic.js'
import {
  getMonthlyReport,
  listAccountingMonths,
  monthKey,
} from '../services/watchAccounting.js'
import {
  confirmSettlementPeriod,
  getSettlementReport,
  listSettlementPeriods,
  markSettlementPaid,
  reopenSettlementPeriod,
} from '../services/paymentSettlement.js'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'

const router = Router()

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

router.get('/overview', requireAdmin, (_req: AuthRequest, res) => {
  const today = todayKey()
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()

  dbRun('DELETE FROM online_presence WHERE last_seen_at < ?', [onlineSince])

  const visitsToday = dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM site_visits WHERE visit_date = ?',
    [today],
  )

  const uniqueUsersToday = dbGet<{ count: number }>(
    'SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) as count FROM site_visits WHERE visit_date = ?',
    [today],
  )

  const onlineNow = dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM online_presence WHERE last_seen_at >= ?',
    [onlineSince],
  )

  const watchToday = dbGet<{ total_seconds: number }>(
    'SELECT COALESCE(SUM(seconds_watched), 0) as total_seconds FROM watch_activity WHERE activity_date = ?',
    [today],
  )

  const watchAllTime = dbGet<{ total_seconds: number }>(
    'SELECT COALESCE(SUM(total_watched_seconds), 0) as total_seconds FROM watch_progress',
  )

  const activeSubscriptions = dbGet<{ count: number }>(
    "SELECT COUNT(*) as count FROM users WHERE subscription_status = 'active'",
  )

  const totalUsers = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM users')

  const watchSecondsToday = watchToday?.total_seconds ?? 0
  const watchSecondsAllTime = watchAllTime?.total_seconds ?? 0

  res.json({
    today: {
      visits: visitsToday?.count ?? 0,
      uniqueVisitors: uniqueUsersToday?.count ?? 0,
      watchMinutes: Math.round(watchSecondsToday / 60),
      watchHours: Math.round((watchSecondsToday / 3600) * 10) / 10,
    },
    live: {
      onlineNow: onlineNow?.count ?? 0,
    },
    totals: {
      users: totalUsers?.count ?? 0,
      activeSubscriptions: activeSubscriptions?.count ?? 0,
      watchMinutes: Math.round(watchSecondsAllTime / 60),
      watchHours: Math.round((watchSecondsAllTime / 3600) * 10) / 10,
    },
  })
})

router.get('/watch-stats', requireAdmin, (_req: AuthRequest, res) => {
  const rows = dbAll<{
    id: string
    title: string
    type: string
    total_seconds: number | null
    viewers: number | null
    avg_position: number | null
  }>(`
    SELECT
      c.id,
      c.title,
      c.type,
      COALESCE(SUM(wp.total_watched_seconds), 0) as total_seconds,
      COUNT(DISTINCT wp.profile_id) as viewers,
      COALESCE(AVG(CASE WHEN wp.duration_seconds > 0 THEN wp.position_seconds / wp.duration_seconds * 100 ELSE 0 END), 0) as avg_position
    FROM content c
    LEFT JOIN watch_progress wp ON wp.content_id = c.id
    GROUP BY c.id
    HAVING total_seconds > 0
    ORDER BY total_seconds DESC
    LIMIT 200
  `)

  res.json({
    stats: rows.map((row) => ({
      contentId: row.id,
      title: row.title,
      type: row.type,
      totalWatchedMinutes: Math.round((row.total_seconds ?? 0) / 60),
      viewerCount: row.viewers ?? 0,
      avgProgressPercent: Math.round(row.avg_position ?? 0),
    })),
  })
})

router.get('/monthly-periods', requireAdmin, (_req: AuthRequest, res) => {
  res.json({ periods: listAccountingMonths() })
})

router.get('/monthly-report', requireAdmin, (req: AuthRequest, res) => {
  try {
    const month = String(req.query.month ?? monthKey()).trim()
    const program = String(req.query.program ?? 'all').trim()
    const report = getMonthlyReport(month, { program: program === 'all' ? undefined : program })
    res.json({ report })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Rapor oluşturulamadı.' })
  }
})

router.get('/settlement-periods', requireAdmin, (_req: AuthRequest, res) => {
  res.json({ periods: listSettlementPeriods() })
})

router.get('/settlement-report', requireAdmin, (req: AuthRequest, res) => {
  try {
    const periodId = String(req.query.period ?? '').trim()
    if (!periodId) {
      res.status(400).json({ error: 'period gerekli.' })
      return
    }
    res.json({ report: getSettlementReport(periodId) })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Ödeme raporu oluşturulamadı.' })
  }
})

router.post('/settlement-report/confirm', requireAdmin, (req: AuthRequest, res) => {
  try {
    const periodId = String(req.body.periodId ?? '').trim()
    if (!periodId) {
      res.status(400).json({ error: 'periodId gerekli.' })
      return
    }
    res.json({ report: confirmSettlementPeriod(periodId) })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Dönem onaylanamadı.' })
  }
})

router.post('/settlement-report/mark-paid', requireAdmin, (req: AuthRequest, res) => {
  try {
    const periodId = String(req.body.periodId ?? '').trim()
    if (!periodId) {
      res.status(400).json({ error: 'periodId gerekli.' })
      return
    }
    res.json({ report: markSettlementPaid(periodId) })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Ödeme durumu güncellenemedi.' })
  }
})

router.post('/settlement-report/reopen', requireAdmin, (req: AuthRequest, res) => {
  try {
    const periodId = String(req.body.periodId ?? '').trim()
    if (!periodId) {
      res.status(400).json({ error: 'periodId gerekli.' })
      return
    }
    res.json({ report: reopenSettlementPeriod(periodId) })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Dönem yeniden açılamadı.' })
  }
})

export default router
