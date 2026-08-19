const DAY_MS = 24 * 60 * 60 * 1000

export function isContentPublished(publishedAt: string | null | undefined, now = new Date()) {
  if (!publishedAt) return false
  return new Date(publishedAt) <= now
}

export function isContentScheduled(publishedAt: string | null | undefined, now = new Date()) {
  if (!publishedAt) return false
  return new Date(publishedAt) > now
}

export function toDateTimeLocalValue(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function formatPublishDate(iso: string | null | undefined) {
  if (!iso) return 'Yayınlanmadı'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function defaultScheduledDateTime() {
  const date = new Date(Date.now() + DAY_MS)
  date.setMinutes(0, 0, 0)
  return toDateTimeLocalValue(date.toISOString())
}
