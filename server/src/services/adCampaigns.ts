import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'

export type AdFrequency = 'once' | 'every_play' | 'monthly_once'
export type AdSkipMode = 'mandatory' | 'skippable'

export interface AdCampaignRow {
  id: string
  name: string
  video_url: string
  kids_video_url: string | null
  target_all: number
  frequency: AdFrequency
  skip_mode: AdSkipMode
  skip_after_seconds: number
  starts_at: string | null
  ends_at: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface AdCampaignInput {
  name: string
  videoUrl: string
  kidsVideoUrl?: string | null
  targetAll: boolean
  contentIds?: string[]
  frequency: AdFrequency
  skipMode: AdSkipMode
  skipAfterSeconds?: number
  startsAt?: string | null
  endsAt?: string | null
  isActive?: boolean
}

function mapCampaign(row: AdCampaignRow, contentIds: string[]) {
  return {
    id: row.id,
    name: row.name,
    videoUrl: row.video_url,
    kidsVideoUrl: row.kids_video_url,
    targetAll: row.target_all === 1,
    contentIds,
    frequency: row.frequency,
    skipMode: row.skip_mode,
    skipAfterSeconds: row.skip_after_seconds,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getCampaignContentIds(campaignId: string) {
  return dbAll<{ content_id: string }>(
    'SELECT content_id FROM ad_campaign_content WHERE campaign_id = ? ORDER BY content_id',
    [campaignId],
  ).map((row) => row.content_id)
}

function isWithinSchedule(row: AdCampaignRow, now = new Date()) {
  if (row.starts_at && new Date(row.starts_at) > now) return false
  if (row.ends_at && new Date(row.ends_at) < now) return false
  return true
}

function hasRecentView(params: {
  campaignId: string
  userId: string
  frequency: AdFrequency
}) {
  if (params.frequency === 'every_play') return false

  if (params.frequency === 'once') {
    const seen = dbGet<{ id: string }>(
      'SELECT id FROM ad_campaign_views WHERE campaign_id = ? AND user_id = ? LIMIT 1',
      [params.campaignId, params.userId],
    )
    return Boolean(seen)
  }

  const monthPrefix = new Date().toISOString().slice(0, 7)
  const seenThisMonth = dbGet<{ id: string }>(
    `SELECT id FROM ad_campaign_views
     WHERE campaign_id = ? AND user_id = ? AND viewed_at LIKE ?
     LIMIT 1`,
    [params.campaignId, params.userId, `${monthPrefix}%`],
  )
  return Boolean(seenThisMonth)
}

export function listAdCampaigns() {
  const rows = dbAll<AdCampaignRow>('SELECT * FROM ad_campaigns ORDER BY updated_at DESC')
  return rows.map((row) => mapCampaign(row, getCampaignContentIds(row.id)))
}

export function getAdCampaign(id: string) {
  const row = dbGet<AdCampaignRow>('SELECT * FROM ad_campaigns WHERE id = ?', [id])
  if (!row) return null
  return mapCampaign(row, getCampaignContentIds(id))
}

function setCampaignContentIds(campaignId: string, contentIds: string[]) {
  dbRun('DELETE FROM ad_campaign_content WHERE campaign_id = ?', [campaignId])
  for (const contentId of [...new Set(contentIds)]) {
    dbRun('INSERT INTO ad_campaign_content (campaign_id, content_id) VALUES (?, ?)', [
      campaignId,
      contentId,
    ])
  }
}

export function createAdCampaign(input: AdCampaignInput) {
  const id = uuid()
  const now = new Date().toISOString()
  dbRun(
    `INSERT INTO ad_campaigns (
      id, name, video_url, kids_video_url, target_all, frequency, skip_mode,
      skip_after_seconds, starts_at, ends_at, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      input.videoUrl.trim(),
      input.kidsVideoUrl?.trim() || null,
      input.targetAll ? 1 : 0,
      input.frequency,
      input.skipMode,
      input.skipMode === 'skippable' ? Math.max(0, input.skipAfterSeconds ?? 5) : 0,
      input.startsAt ?? null,
      input.endsAt ?? null,
      input.isActive ? 1 : 0,
      now,
      now,
    ],
  )
  if (!input.targetAll) {
    setCampaignContentIds(id, input.contentIds ?? [])
  }
  return getAdCampaign(id)!
}

export function updateAdCampaign(id: string, input: Partial<AdCampaignInput>) {
  const existing = dbGet<AdCampaignRow>('SELECT * FROM ad_campaigns WHERE id = ?', [id])
  if (!existing) return null

  const skipMode = input.skipMode ?? existing.skip_mode
  const skipAfterSeconds =
    skipMode === 'skippable'
      ? Math.max(0, input.skipAfterSeconds ?? existing.skip_after_seconds)
      : 0

  dbRun(
    `UPDATE ad_campaigns SET
      name = ?,
      video_url = ?,
      kids_video_url = ?,
      target_all = ?,
      frequency = ?,
      skip_mode = ?,
      skip_after_seconds = ?,
      starts_at = ?,
      ends_at = ?,
      is_active = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      (input.name ?? existing.name).trim(),
      (input.videoUrl ?? existing.video_url).trim(),
      input.kidsVideoUrl !== undefined
        ? input.kidsVideoUrl?.trim() || null
        : existing.kids_video_url,
      (input.targetAll ?? existing.target_all === 1) ? 1 : 0,
      input.frequency ?? existing.frequency,
      skipMode,
      skipAfterSeconds,
      input.startsAt !== undefined ? input.startsAt : existing.starts_at,
      input.endsAt !== undefined ? input.endsAt : existing.ends_at,
      (input.isActive ?? existing.is_active === 1) ? 1 : 0,
      new Date().toISOString(),
      id,
    ],
  )

  if (input.targetAll === true) {
    dbRun('DELETE FROM ad_campaign_content WHERE campaign_id = ?', [id])
  } else if (input.contentIds) {
    setCampaignContentIds(id, input.contentIds)
  }

  return getAdCampaign(id)
}

export function deleteAdCampaign(id: string) {
  dbRun('DELETE FROM ad_campaign_content WHERE campaign_id = ?', [id])
  dbRun('DELETE FROM ad_campaign_views WHERE campaign_id = ?', [id])
  dbRun('DELETE FROM ad_campaigns WHERE id = ?', [id])
}

export function resolveAdForContent(params: {
  contentId: string
  userId: string
  isKidsProfile: boolean
}) {
  const rows = dbAll<AdCampaignRow>(
    'SELECT * FROM ad_campaigns WHERE is_active = 1 ORDER BY updated_at DESC',
  )

  for (const row of rows) {
    if (!isWithinSchedule(row)) continue

    if (row.target_all !== 1) {
      const linked = dbGet<{ content_id: string }>(
        'SELECT content_id FROM ad_campaign_content WHERE campaign_id = ? AND content_id = ?',
        [row.id, params.contentId],
      )
      if (!linked) continue
    }

    if (hasRecentView({ campaignId: row.id, userId: params.userId, frequency: row.frequency })) {
      continue
    }

    const kidsVideo = row.kids_video_url?.trim()
    const videoUrl =
      params.isKidsProfile && kidsVideo ? kidsVideo : row.video_url

    if (!videoUrl?.trim()) continue

    return {
      show: true as const,
      campaignId: row.id,
      sponsorName: row.name,
      videoUrl,
      skipMode: row.skip_mode as AdSkipMode,
      skipAfterSeconds: row.skip_after_seconds,
      frequency: row.frequency as AdFrequency,
    }
  }

  return { show: false as const }
}

export function recordAdView(params: {
  campaignId: string
  userId: string
  profileId: string | null
  contentId: string
}) {
  dbRun(
    `INSERT INTO ad_campaign_views (id, campaign_id, user_id, profile_id, content_id, viewed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uuid(), params.campaignId, params.userId, params.profileId, params.contentId, new Date().toISOString()],
  )
}
