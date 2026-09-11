import {needsSchoolReview} from './studentApplicationType.js'
import { assertCreatorPlayback } from './creatorPlayback.js'
import { dbGet, dbRun } from '../db.js'
import { normalizeContentType } from '../constants/contentTypes.js'
import { serializeCredits } from './credits.js'
import { parseContentAddedAt, parseLicenseDate } from './license.js'
import { resolvePublishedAtOverride } from './publish.js'
import { resolveStreamProvider } from './streamProvider.js'
import type { ContentRow, CreatorRow } from '../types.js'

export function applyCreatorReviewStatus(
  existing: ContentRow,
  reviewStatus: string,
  options?: { publishedAt?: string | null; reviewNote?: string | null },
) {
  if (!['pending', 'under_review', 'on_hold', 'approved', 'rejected', 'published'].includes(reviewStatus)) throw new Error('Geçersiz inceleme durumu.')
  if (['approved', 'published'].includes(reviewStatus) && existing.creator_id) {
    const creator = dbGet<CreatorRow>('SELECT * FROM creators WHERE id = ?', [existing.creator_id])
    if (!creator?.registration_paid_at || creator.status !== 'approved') throw new Error('Ödeme ve hesap onayı tamamlanmalıdır.')
    if (needsSchoolReview(existing) && existing.school_review_status !== 'approved') throw new Error('Okul onayı tamamlanmalıdır.')
  }
  assertCreatorPlayback(existing, reviewStatus)
  let publishedAt: string | null
  if (reviewStatus !== 'published') {
    publishedAt = null
  } else if (options?.publishedAt !== undefined) {
    publishedAt = options.publishedAt
  } else if (reviewStatus === 'published') {
    publishedAt = existing.published_at ?? new Date().toISOString()
  } else if (reviewStatus === 'rejected' || reviewStatus === 'pending') {
    publishedAt = null
  } else {
    publishedAt = existing.published_at ?? null
  }

  const reviewNote =
    options?.reviewNote !== undefined
      ? options.reviewNote
      : reviewStatus === 'published'
        ? null
        : existing.review_note ?? null

  dbRun('UPDATE content SET review_status = ?, published_at = ?, review_note = ? WHERE id = ?', [
    reviewStatus,
    publishedAt,
    reviewNote,
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

  const sourceVideoUrl =
    body.sourceVideoUrl !== undefined || body.source_video_url !== undefined
      ? String(body.sourceVideoUrl ?? body.source_video_url ?? '').trim()
      : existing.source_video_url ?? existing.video_url

  const nextVideoUrl = String(body.videoUrl ?? body.video_url ?? existing.video_url).trim()
  assertCreatorPlayback(
    { ...existing, video_url: nextVideoUrl, source_video_url: sourceVideoUrl },
    String(body.reviewStatus ?? body.review_status ?? existing.review_status),
  )
  const videoChanged = nextVideoUrl !== (existing.video_url ?? '')
  const streamProvider =
    videoChanged || body.streamProvider !== undefined || body.stream_provider !== undefined
      ? resolveStreamProvider(body, nextVideoUrl)
      : existing.stream_provider ?? 'custom'
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
      source_video_url = ?,
      stream_provider = ?,
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
      nextVideoUrl,
      sourceVideoUrl,
      streamProvider,
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
  const reviewNote =
    body.reviewNote !== undefined || body.review_note !== undefined
      ? String(body.reviewNote ?? body.review_note ?? '').trim() || null
      : undefined

  const publishedAtOverride = resolvePublishedAtOverride(body, existing.published_at)

  if (body.reviewStatus !== undefined || body.review_status !== undefined) {
    applyCreatorReviewStatus(existing, reviewStatus, {
      publishedAt: publishedAtOverride,
      reviewNote,
    })
    return
  }

  if (publishedAtOverride !== undefined) {
    applyCreatorReviewStatus(existing, reviewStatus, { publishedAt: publishedAtOverride, reviewNote })
  }
}
