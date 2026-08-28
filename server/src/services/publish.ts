export function isContentPublished(publishedAt: string | null | undefined, now = new Date()) {
  if (!publishedAt) return false
  return new Date(publishedAt) <= now
}

export function isContentScheduled(publishedAt: string | null | undefined, now = new Date()) {
  if (!publishedAt) return false
  return new Date(publishedAt) > now
}

export function parsePublishedAt(
  value: unknown,
  options?: { publishNow?: boolean; existing?: string | null },
) {
  if (options?.publishNow === true) {
    return new Date().toISOString()
  }

  if (options?.publishNow === false) {
    return null
  }

  if (value === null) return null

  if (value !== undefined) {
    const parsed = new Date(String(value))
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Geçersiz yayın tarihi.')
    }
    return parsed.toISOString()
  }

  return options?.existing ?? null
}

/** POST/PATCH gövdesinden yayın durumu: true = yayınla, false = taslağa al, undefined = dokunma */
export function parsePublishNowFlag(body: Record<string, unknown>): boolean | undefined {
  if (body.publishNow === true || body.publish_now === true) return true
  if (body.publishNow === false || body.publish_now === false) return false
  return undefined
}

/** ISO (`2026-08-26T12:00:00.000Z`) ve SQLite datetime karşılaştırması */
export const PUBLISHED_CONTENT_SQL = `published_at IS NOT NULL AND datetime(substr(replace(published_at, 'T', ' '), 1, 19)) <= datetime('now')`

/** JOIN sorgularında content alias (`c`) ile kullanın */
export const PUBLISHED_CONTENT_SQL_C = `c.published_at IS NOT NULL AND datetime(substr(replace(c.published_at, 'T', ' '), 1, 19)) <= datetime('now')`

/** journal_posts.published_at — NULL = tarihsiz yayın */
export const JOURNAL_PUBLISHED_SQL = `status = 'published' AND (published_at IS NULL OR datetime(substr(replace(published_at, 'T', ' '), 1, 19)) <= datetime('now'))`
