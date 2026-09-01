/** Shared watch-progress UI helpers (browse row, history page). */

export function watchProgressPercent(position: number, duration: number) {
  if (duration <= 0) return 0
  return Math.min(100, Math.round((position / duration) * 100))
}

export function isInProgressWatch(position: number, duration: number) {
  if (duration <= 0 || position < 10) return false
  return position < duration - 30
}

export function isCompletedWatch(position: number, duration: number) {
  return duration > 0 && position >= duration - 30
}

export function formatWatchPosition(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hrs > 0) return `${hrs}:${String(remMins).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
  return `${mins}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}
