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
  if (options?.publishNow) {
    return new Date().toISOString()
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

/** ISO (`2026-08-26T12:00:00.000Z`) ve SQLite datetime karşılaştırması */
export const PUBLISHED_CONTENT_SQL = `published_at IS NOT NULL AND datetime(substr(replace(published_at, 'T', ' '), 1, 19)) <= datetime('now')`

/** journal_posts.published_at — NULL = tarihsiz yayın */
export const JOURNAL_PUBLISHED_SQL = `status = 'published' AND (published_at IS NULL OR datetime(substr(replace(published_at, 'T', ' '), 1, 19)) <= datetime('now'))`
