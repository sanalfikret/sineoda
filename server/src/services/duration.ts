import type { ContentRow } from '../types.js'

export function formatMinutesDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours}s ${mins}dk`
  if (hours > 0) return `${hours}s`
  return `${mins} dk`
}

export function parseDurationMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed)
}

export function resolveDurationFields(
  body: Record<string, unknown>,
  existing?: Pick<ContentRow, 'duration' | 'duration_minutes' | 'type'>,
) {
  const type = body.type !== undefined ? String(body.type) : existing?.type ?? 'film'
  const isSeries = type === 'dizi'
  const hasMinutesInput = body.durationMinutes !== undefined || body.duration_minutes !== undefined
  const durationMinutes = hasMinutesInput
    ? parseDurationMinutes(body.durationMinutes ?? body.duration_minutes)
    : existing?.duration_minutes ?? null

  if (isSeries) {
    return {
      durationMinutes: null,
      duration:
        body.duration !== undefined
          ? String(body.duration).trim()
          : existing?.duration ?? '',
    }
  }

  if (durationMinutes && durationMinutes > 0) {
    return {
      durationMinutes,
      duration: formatMinutesDuration(durationMinutes),
    }
  }

  const durationText =
    body.duration !== undefined ? String(body.duration).trim() : existing?.duration ?? ''

  return {
    durationMinutes: null,
    duration: durationText,
  }
}
