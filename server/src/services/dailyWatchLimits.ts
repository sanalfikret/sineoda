import { v4 as uuid } from 'uuid'
import { dbGet, dbRun } from '../db.js'

export const DAILY_TITLE_LIMIT = 3
export const DAILY_SECONDS_LIMIT = 300 * 60

const ISTANBUL_TZ = 'Europe/Istanbul'

export function getIstanbulDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getIstanbulMonthKey(date = new Date()) {
  return getIstanbulDateKey(date).slice(0, 7)
}

type UsageRow = {
  total_seconds: number
  title_starts: number
}

function ensureUsageRow(profileId: string, usageDate: string) {
  const row = dbGet<UsageRow>(
    'SELECT total_seconds, title_starts FROM daily_watch_usage WHERE profile_id = ? AND usage_date = ?',
    [profileId, usageDate],
  )
  if (row) return row

  dbRun(
    'INSERT INTO daily_watch_usage (profile_id, usage_date, total_seconds, title_starts) VALUES (?, ?, 0, 0)',
    [profileId, usageDate],
  )
  return { total_seconds: 0, title_starts: 0 }
}

export function getDailyWatchUsage(profileId: string, usageDate = getIstanbulDateKey()) {
  const row = ensureUsageRow(profileId, usageDate)
  const titlesUsed = dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM daily_watch_titles WHERE profile_id = ? AND usage_date = ?',
    [profileId, usageDate],
  )?.count ?? row.title_starts

  return {
    usageDate,
    titlesUsed,
    titleLimit: DAILY_TITLE_LIMIT,
    totalSeconds: row.total_seconds,
    minutesUsed: Math.floor(row.total_seconds / 60),
    minuteLimit: DAILY_SECONDS_LIMIT / 60,
    titlesRemaining: Math.max(0, DAILY_TITLE_LIMIT - titlesUsed),
    minutesRemaining: Math.max(0, Math.floor((DAILY_SECONDS_LIMIT - row.total_seconds) / 60)),
  }
}

function titleStartedToday(profileId: string, usageDate: string, contentId: string, episodeId: string) {
  return Boolean(
    dbGet(
      'SELECT 1 FROM daily_watch_titles WHERE profile_id = ? AND usage_date = ? AND content_id = ? AND episode_id = ?',
      [profileId, usageDate, contentId, episodeId],
    ),
  )
}

export function checkDailyWatchAllowance(input: {
  profileId: string
  contentId: string
  episodeId: string
}) {
  const usageDate = getIstanbulDateKey()
  const usage = getDailyWatchUsage(input.profileId, usageDate)
  const alreadyStarted = titleStartedToday(
    input.profileId,
    usageDate,
    input.contentId,
    input.episodeId,
  )

  if (usage.totalSeconds >= DAILY_SECONDS_LIMIT) {
    return {
      allowed: false as const,
      reason: 'daily_limit' as const,
      limitType: 'minutes' as const,
      usage,
    }
  }

  if (!alreadyStarted && usage.titlesUsed >= DAILY_TITLE_LIMIT) {
    return {
      allowed: false as const,
      reason: 'daily_limit' as const,
      limitType: 'titles' as const,
      usage,
    }
  }

  return { allowed: true as const, usage, alreadyStarted }
}

export function recordDailyTitleStart(input: {
  profileId: string
  contentId: string
  episodeId: string
}) {
  const usageDate = getIstanbulDateKey()
  if (titleStartedToday(input.profileId, usageDate, input.contentId, input.episodeId)) {
    return getDailyWatchUsage(input.profileId, usageDate)
  }

  ensureUsageRow(input.profileId, usageDate)
  dbRun(
    'INSERT INTO daily_watch_titles (id, profile_id, usage_date, content_id, episode_id, started_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuid(), input.profileId, usageDate, input.contentId, input.episodeId, new Date().toISOString()],
  )
  dbRun(
    'UPDATE daily_watch_usage SET title_starts = title_starts + 1 WHERE profile_id = ? AND usage_date = ?',
    [input.profileId, usageDate],
  )
  return getDailyWatchUsage(input.profileId, usageDate)
}

export function addDailyWatchSeconds(profileId: string, seconds: number) {
  if (seconds <= 0) return getDailyWatchUsage(profileId)
  const usageDate = getIstanbulDateKey()
  ensureUsageRow(profileId, usageDate)
  dbRun(
    'UPDATE daily_watch_usage SET total_seconds = total_seconds + ? WHERE profile_id = ? AND usage_date = ?',
    [seconds, profileId, usageDate],
  )
  return getDailyWatchUsage(profileId, usageDate)
}

export function isDailyLimitReached(profileId: string) {
  const usage = getDailyWatchUsage(profileId)
  return usage.totalSeconds >= DAILY_SECONDS_LIMIT || usage.titlesUsed >= DAILY_TITLE_LIMIT
}
