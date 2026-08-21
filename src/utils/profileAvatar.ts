export function isProfilePhoto(avatar: string) {
  const value = avatar.trim()
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/uploads/') ||
    value.startsWith('/api/')
  )
}

export function formatWatchHours(totalSeconds: number) {
  if (totalSeconds <= 0) return '0 dk'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours <= 0) return `${minutes} dk`
  if (minutes <= 0) return `${hours} sa`
  return `${hours} sa ${minutes} dk`
}
