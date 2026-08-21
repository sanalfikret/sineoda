import type { AdminStudentCinemaItem } from '../api/client'

type StatusItem = Pick<AdminStudentCinemaItem, 'reviewStatus'> & {
  publishedAt?: string | null
}

export function isScheduledStudentFilm(item: StatusItem) {
  return (
    item.reviewStatus === 'published' &&
    Boolean(item.publishedAt) &&
    new Date(item.publishedAt!) > new Date()
  )
}

export function studentFilmStatusLabel(item: StatusItem) {
  if (isScheduledStudentFilm(item)) return 'Planlandı'
  if (item.reviewStatus === 'published') return 'Yayında'
  if (item.reviewStatus === 'rejected') return 'Reddedildi'
  if (item.reviewStatus === 'pending') return 'İncelemede'
  return item.reviewStatus
}

export function studentFilmStatusClass(item: StatusItem) {
  if (isScheduledStudentFilm(item)) return 'bg-sky-500/15 text-sky-300'
  if (item.reviewStatus === 'published') return 'bg-emerald-500/15 text-emerald-300'
  if (item.reviewStatus === 'rejected') return 'bg-red-500/15 text-red-300'
  return 'bg-amber-500/15 text-amber-200'
}

export function formatPublishDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}
