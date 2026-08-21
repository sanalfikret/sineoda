import { dbRun } from '../db.js'
import { normalizeContentType } from '../constants/contentTypes.js'
import { serializeCredits } from './credits.js'
import { parseContentAddedAt, parseLicenseDate } from './license.js'
import { parsePublishedAt } from './publish.js'
import type { ContentRow } from '../types.js'

export function applyCreatorReviewStatus(
  existing: ContentRow,
  reviewStatus: string,
  options?: { publishedAt?: string | null },
) {
  let publishedAt: string | null
  if (options?.publishedAt !== undefined) {
    publishedAt = options.publishedAt
  } else if (reviewStatus === 'published') {
    publishedAt = existing.published_at ?? new Date().toISOString()
  } else if (reviewStatus === 'rejected' || reviewStatus === 'pending') {
    publishedAt = null
  } else {
    publishedAt = existing.published_at ?? null
  }

  dbRun('UPDATE content SET review_status = ?, published_at = ? WHERE id = ?', [
    reviewStatus,
    publishedAt,
    existing.id,
  ])
}

export function updateCreatorContentFields(existing: ContentRow, body: Record<string, unknown>) {
  const licenseExpiresAt =
    body.licenseUnlimited === true || body.license_unlimited === true
      ? null
      : body.licenseExpiresAt !== undefined || body.license_expires_at !== undefined
        ? parseLicenseDate(body.licenseExpiresAt ?? body.license_expires_at)
        : existing.license_expires_at ?? null

  dbRun(
    `UPDATE content SET
      title = ?,
      description = ?,
      year = ?,
      duration = ?,
      rating = ?,
      type = ?,
      genres = ?,
      poster = ?,
      backdrop = ?,
      video_url = ?,
      trailer_url = ?,
      credits_json = ?,
      license_expires_at = ?,
      content_added_at = ?
    WHERE id = ?`,
    [
      body.title !== undefined ? String(body.title).trim() : existing.title,
      body.description !== undefined ? String(body.description).trim() : existing.description,
      body.year !== undefined ? Number(body.year) : existing.year,
      body.duration !== undefined ? String(body.duration).trim() : existing.duration,
      body.rating !== undefined ? String(body.rating).trim() : existing.rating,
      body.type !== undefined ? normalizeContentType(body.type, existing.type) : existing.type,
      body.genres !== undefined ? JSON.stringify(body.genres) : existing.genres,
      body.poster !== undefined ? String(body.poster).trim() : existing.poster,
      body.backdrop !== undefined ? String(body.backdrop).trim() : existing.backdrop,
      body.videoUrl !== undefined
        ? String(body.videoUrl).trim()
        : body.video_url !== undefined
          ? String(body.video_url).trim()
          : existing.video_url,
      body.trailerUrl !== undefined
        ? String(body.trailerUrl).trim()
        : body.trailer_url !== undefined
          ? String(body.trailer_url).trim()
          : existing.trailer_url ?? '',
      body.credits !== undefined
        ? serializeCredits(body.credits)
        : existing.credits_json ?? '{}',
      licenseExpiresAt,
      body.contentAddedAt !== undefined || body.content_added_at !== undefined
        ? parseContentAddedAt(body.contentAddedAt ?? body.content_added_at)
        : existing.content_added_at ?? parseContentAddedAt(null),
      existing.id,
    ],
  )
}

export function resolveCreatorPublishUpdate(
  existing: ContentRow,
  body: Record<string, unknown>,
  reviewStatus: string,
) {
  if (body.reviewStatus !== undefined || body.review_status !== undefined) {
    const publishedAtOverride =
      body.publishedAt !== undefined || body.publishNow === true
        ? parsePublishedAt(body.publishNow ? null : body.publishedAt ?? body.published_at, {
            publishNow: body.publishNow === true,
            existing: existing.published_at ?? null,
          })
        : undefined
    applyCreatorReviewStatus(existing, reviewStatus, {
      publishedAt: publishedAtOverride,
    })
    return
  }

  if (body.publishedAt !== undefined || body.publishNow === true) {
    const publishedAt = parsePublishedAt(body.publishNow ? null : body.publishedAt ?? body.published_at, {
      publishNow: body.publishNow === true,
      existing: existing.published_at ?? null,
    })
    applyCreatorReviewStatus(existing, reviewStatus, { publishedAt })
  }
}
