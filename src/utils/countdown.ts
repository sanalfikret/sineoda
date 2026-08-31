export interface CountdownParts {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

export function getCountdownParts(targetIso: string | null | undefined, now = Date.now()): CountdownParts {
  if (!targetIso) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  const target = new Date(targetIso).getTime()
  const totalMs = Math.max(0, target - now)
  const expired = totalMs <= 0

  const totalSeconds = Math.floor(totalMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { totalMs, days, hours, minutes, seconds, expired }
}

export function formatLaunchDateTr(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  })
}

export function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function datetimeLocalToIso(value: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}
