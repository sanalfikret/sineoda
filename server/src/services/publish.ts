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

export const PUBLISHED_CONTENT_SQL = `published_at IS NOT NULL AND published_at <= datetime('now')`
