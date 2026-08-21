import { dbAll, dbGet, dbRun } from '../db.js'

export interface MonthlyContentStat {
  contentId: string
  title: string
  type: string
  program: 'standard' | 'student_cinema'
  creatorId: string | null
  creatorName: string | null
  studioName: string | null
  qualifiedSeconds: number
  watchSeconds: number
  viewerCount: number
  qualifiedMinutes: number
  watchMinutes: number
  sharePercent: number
}

export interface MonthlyReport {
  month: string
  status: 'open' | 'closed'
  totalQualifiedMinutes: number
  totalWatchMinutes: number
  items: MonthlyContentStat[]
}

export function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

export function monthDateRange(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const start = `${month}-01`
  const nextMonth = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, '0')}-01`
  return { start, endExclusive: nextMonth }
}

function ensurePeriodRow(month: string) {
  const exists = dbGet('SELECT month FROM watch_accounting_periods WHERE month = ?', [month])
  if (!exists) {
    dbRun(
      'INSERT INTO watch_accounting_periods (month, total_qualified_seconds, total_watch_seconds, status) VALUES (?, 0, 0, ?)',
      [month, month === monthKey() ? 'open' : 'closed'],
    )
  }
}

function aggregateQualifiedByContent(month: string) {
  const { start, endExclusive } = monthDateRange(month)
  return dbAll<{
    content_id: string
    creator_id: string | null
    qualified_seconds: number
    viewer_count: number
  }>(
    `SELECT
      cqa.content_id,
      c.creator_id,
      COALESCE(SUM(cqa.seconds_watched), 0) AS qualified_seconds,
      COUNT(DISTINCT cqa.profile_id) AS viewer_count
    FROM creator_qualified_activity cqa
    JOIN content c ON c.id = cqa.content_id
    WHERE cqa.activity_date >= ? AND cqa.activity_date < ?
    GROUP BY cqa.content_id, c.creator_id`,
    [start, endExclusive],
  )
}

function aggregateWatchByContent(month: string) {
  const { start, endExclusive } = monthDateRange(month)
  return dbAll<{ content_id: string; watch_seconds: number }>(
    `SELECT
      content_id,
      COALESCE(SUM(seconds_watched), 0) AS watch_seconds
    FROM watch_activity
    WHERE content_id IS NOT NULL
      AND content_id != ''
      AND activity_date >= ?
      AND activity_date < ?
    GROUP BY content_id`,
    [start, endExclusive],
  )
}

function readArchivedMonth(month: string) {
  return dbAll<{
    content_id: string
    creator_id: string | null
    program: string
    qualified_seconds: number
    watch_seconds: number
    viewer_count: number
    title: string
    type: string
    creator_name: string | null
    studio_name: string | null
  }>(
    `SELECT
      m.content_id,
      m.creator_id,
      m.program,
      m.qualified_seconds,
      m.watch_seconds,
      m.viewer_count,
      c.title,
      c.type,
      u.name AS creator_name,
      cr.studio_name
    FROM content_watch_monthly m
    JOIN content c ON c.id = m.content_id
    LEFT JOIN creators cr ON cr.id = m.creator_id
    LEFT JOIN users u ON u.id = cr.user_id
    WHERE m.month = ?
    ORDER BY m.qualified_seconds DESC`,
    [month],
  )
}

function buildReportItems(
  qualifiedRows: Array<{
    content_id: string
    creator_id: string | null
    qualified_seconds: number
    viewer_count: number
    program?: string
    title?: string
    type?: string
    creator_name?: string | null
    studio_name?: string | null
    watch_seconds?: number
  }>,
  watchByContent: Map<string, number>,
  totalQualifiedSeconds: number,
) {
  return qualifiedRows
    .map((row) => {
      const qualifiedSeconds = row.qualified_seconds ?? 0
      const watchSeconds = row.watch_seconds ?? watchByContent.get(row.content_id) ?? 0
      return {
        contentId: row.content_id,
        title: row.title ?? row.content_id,
        type: row.type ?? 'film',
        program: (row.program ?? 'standard') as 'standard' | 'student_cinema',
        creatorId: row.creator_id,
        creatorName: row.creator_name ?? null,
        studioName: row.studio_name ?? null,
        qualifiedSeconds,
        watchSeconds,
        viewerCount: row.viewer_count ?? 0,
        qualifiedMinutes: Math.round(qualifiedSeconds / 60),
        watchMinutes: Math.round(watchSeconds / 60),
        sharePercent:
          totalQualifiedSeconds > 0
            ? Math.round((qualifiedSeconds / totalQualifiedSeconds) * 1000) / 10
            : 0,
      }
    })
    .sort((a, b) => b.qualifiedSeconds - a.qualifiedSeconds)
}

export function finalizeMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Geçersiz ay formatı.')
  }

  const qualifiedRows = aggregateQualifiedByContent(month)
  const watchRows = aggregateWatchByContent(month)
  const watchByContent = new Map(watchRows.map((row) => [row.content_id, row.watch_seconds]))

  let totalQualified = 0
  let totalWatch = 0

  for (const row of qualifiedRows) {
    const watchSeconds = watchByContent.get(row.content_id) ?? 0
    const content = dbGet<{ program?: string }>('SELECT program FROM content WHERE id = ?', [row.content_id])
    totalQualified += row.qualified_seconds
    totalWatch += watchSeconds

    dbRun(
      `INSERT INTO content_watch_monthly (content_id, month, creator_id, program, qualified_seconds, watch_seconds, viewer_count, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_id, month) DO UPDATE SET
         creator_id = excluded.creator_id,
         program = excluded.program,
         qualified_seconds = excluded.qualified_seconds,
         watch_seconds = excluded.watch_seconds,
         viewer_count = excluded.viewer_count,
         archived_at = excluded.archived_at`,
      [
        row.content_id,
        month,
        row.creator_id,
        content?.program ?? 'standard',
        row.qualified_seconds,
        watchSeconds,
        row.viewer_count,
        new Date().toISOString(),
      ],
    )
  }

  ensurePeriodRow(month)
  dbRun(
    `UPDATE watch_accounting_periods
     SET total_qualified_seconds = ?, total_watch_seconds = ?, status = 'closed', closed_at = ?
     WHERE month = ?`,
    [totalQualified, totalWatch, new Date().toISOString(), month],
  )

  return { month, totalQualifiedMinutes: Math.round(totalQualified / 60), itemCount: qualifiedRows.length }
}

export function ensureMonthlyRollover() {
  const current = monthKey()
  const openPast = dbAll<{ month: string }>(
    `SELECT month FROM watch_accounting_periods
     WHERE status = 'open' AND month < ?
     ORDER BY month ASC`,
    [current],
  )

  for (const row of openPast) {
    finalizeMonth(row.month)
  }

  ensurePeriodRow(current)

  const priorMonths = dbAll<{ month: string }>(
    `SELECT DISTINCT substr(activity_date, 1, 7) AS month
     FROM creator_qualified_activity
     WHERE substr(activity_date, 1, 7) < ?
     ORDER BY month ASC`,
    [current],
  )

  for (const row of priorMonths) {
    const archived = dbGet('SELECT month FROM watch_accounting_periods WHERE month = ? AND status = ?', [
      row.month,
      'closed',
    ])
    if (!archived) {
      finalizeMonth(row.month)
    }
  }
}

export function listAccountingMonths() {
  ensurePeriodRow(monthKey())
  const rows = dbAll<{ month: string; status: string; total_qualified_seconds: number; closed_at: string | null }>(
    'SELECT month, status, total_qualified_seconds, closed_at FROM watch_accounting_periods ORDER BY month DESC',
  )
  const current = monthKey()
  if (!rows.some((row) => row.month === current)) {
    rows.unshift({ month: current, status: 'open', total_qualified_seconds: 0, closed_at: null })
  }
  return rows.map((row) => ({
    month: row.month,
    status: row.month === current ? 'open' : (row.status as 'open' | 'closed'),
    totalQualifiedMinutes: Math.round((row.total_qualified_seconds ?? 0) / 60),
    closedAt: row.closed_at,
  }))
}

export function getMonthlyReport(month: string, options?: { creatorId?: string; program?: string }) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Geçersiz ay formatı.')
  }

  const current = monthKey()
  const period = dbGet<{ status: string; total_qualified_seconds: number; total_watch_seconds: number }>(
    'SELECT status, total_qualified_seconds, total_watch_seconds FROM watch_accounting_periods WHERE month = ?',
    [month],
  )

  const isLive = month === current || period?.status === 'open'

  if (!isLive && period?.status === 'closed') {
    let rows = readArchivedMonth(month)
    if (options?.creatorId) {
      rows = rows.filter((row) => row.creator_id === options.creatorId)
    }
    if (options?.program && options.program !== 'all') {
      rows = rows.filter((row) => row.program === options.program)
    }

    const filteredTotal = rows.reduce((sum, row) => sum + row.qualified_seconds, 0)
    const totalQualified = options?.creatorId || (options?.program && options.program !== 'all')
      ? filteredTotal
      : period.total_qualified_seconds

    const items = buildReportItems(
      rows.map((row) => ({
        content_id: row.content_id,
        creator_id: row.creator_id,
        qualified_seconds: row.qualified_seconds,
        viewer_count: row.viewer_count,
        program: row.program,
        title: row.title,
        type: row.type,
        creator_name: row.creator_name,
        studio_name: row.studio_name,
        watch_seconds: row.watch_seconds,
      })),
      new Map(rows.map((row) => [row.content_id, row.watch_seconds])),
      totalQualified,
    )

    return {
      month,
      status: 'closed' as const,
      totalQualifiedMinutes: Math.round(totalQualified / 60),
      totalWatchMinutes: Math.round((period.total_watch_seconds ?? 0) / 60),
      items,
    }
  }

  let qualifiedRows = aggregateQualifiedByContent(month)
  const watchRows = aggregateWatchByContent(month)
  const watchByContent = new Map(watchRows.map((row) => [row.content_id, row.watch_seconds]))

  if (options?.creatorId) {
    qualifiedRows = qualifiedRows.filter((row) => row.creator_id === options.creatorId)
  }

  const enriched = qualifiedRows.map((row) => {
    const meta = dbGet<{
      title: string
      type: string
      program: string
      creator_name: string | null
      studio_name: string | null
    }>(
      `SELECT c.title, c.type, c.program, u.name AS creator_name, cr.studio_name
       FROM content c
       LEFT JOIN creators cr ON cr.id = c.creator_id
       LEFT JOIN users u ON u.id = cr.user_id
       WHERE c.id = ?`,
      [row.content_id],
    )
    return {
      ...row,
      program: meta?.program ?? 'standard',
      title: meta?.title ?? row.content_id,
      type: meta?.type ?? 'film',
      creator_name: meta?.creator_name ?? null,
      studio_name: meta?.studio_name ?? null,
      watch_seconds: watchByContent.get(row.content_id) ?? 0,
    }
  }).filter((row) => {
    if (options?.program && options.program !== 'all') {
      return row.program === options.program
    }
    return true
  })

  const platformTotal = aggregateQualifiedByContent(month).reduce((sum, row) => sum + row.qualified_seconds, 0)
  const scopedTotal = options?.creatorId
    ? enriched.reduce((sum, row) => sum + row.qualified_seconds, 0)
    : options?.program && options.program !== 'all'
      ? enriched.reduce((sum, row) => sum + row.qualified_seconds, 0)
      : platformTotal

  const shareTotal =
    options?.creatorId || (options?.program && options.program !== 'all') ? scopedTotal : platformTotal

  const items = buildReportItems(enriched, watchByContent, shareTotal)
  const totalQualifiedSeconds = enriched.reduce((sum, row) => sum + row.qualified_seconds, 0)
  const totalWatchSeconds = enriched.reduce((sum, row) => sum + (row.watch_seconds ?? 0), 0)

  ensurePeriodRow(month)

  return {
    month,
    status: month === current ? ('open' as const) : ('closed' as const),
    totalQualifiedMinutes: Math.round(totalQualifiedSeconds / 60),
    totalWatchMinutes: Math.round(totalWatchSeconds / 60),
    items,
  }
}

export function seedDemoMonthlyIfEmpty() {
  const count = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM content_watch_monthly')
  if ((count?.count ?? 0) > 0) return

  const creators = dbAll<{ content_id: string; creator_id: string; program: string }>(
    `SELECT id AS content_id, creator_id, program FROM content WHERE creator_id IS NOT NULL LIMIT 20`,
  )
  if (creators.length === 0) return

  const prevMonth = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15))
  let totalQ = 0
  let totalW = 0

  creators.forEach((row, index) => {
    const qualified = (index + 1) * 1800
    const watch = qualified + 600
    totalQ += qualified
    totalW += watch
    dbRun(
      `INSERT INTO content_watch_monthly (content_id, month, creator_id, program, qualified_seconds, watch_seconds, viewer_count, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_id, month) DO UPDATE SET
         creator_id = excluded.creator_id,
         program = excluded.program,
         qualified_seconds = excluded.qualified_seconds,
         watch_seconds = excluded.watch_seconds,
         viewer_count = excluded.viewer_count,
         archived_at = excluded.archived_at`,
      [row.content_id, prevMonth, row.creator_id, row.program, qualified, watch, index + 3, new Date().toISOString()],
    )
  })

  dbRun(
    `INSERT INTO watch_accounting_periods (month, total_qualified_seconds, total_watch_seconds, status, closed_at)
     VALUES (?, ?, ?, 'closed', ?)
     ON CONFLICT(month) DO UPDATE SET
       total_qualified_seconds = excluded.total_qualified_seconds,
       total_watch_seconds = excluded.total_watch_seconds,
       status = 'closed',
       closed_at = excluded.closed_at`,
    [prevMonth, totalQ, totalW, new Date().toISOString()],
  )
}
