import type { ContentRow } from '../types.js'

const POSTERS = [
  'photo-1536440136628-849c177e76a1',
  'photo-1489599849927-2ee91cede3ba',
  'photo-1478720568477-152d9b164e26',
  'photo-1524231757912-21f4fe3a7200',
  'photo-1509281373367-fa7cf25a27f8',
  'photo-1448375240586-882707db888b',
  'photo-1535016120720-40c6464ebe02',
  'photo-1559827260-dc66d52bef19',
  'photo-1611162617474-5b21e939e113',
  'photo-1550751827-4bd374c3f58b',
  'photo-1485846234645-a62644f84728',
  'photo-1517604931442-7e0c8ed2963c',
  'photo-1594909128353-aa2d4ae0e8fb',
  'photo-1506905925346-21bda4d32df4',
  'photo-1574267432553-4b4628081c31',
  'photo-1451187580459-43490279c0fa',
  'photo-1446776811953-b23d57bd21aa',
  'photo-1419242902214-272b4f66ee7a',
  'photo-1504674900247-0877df9cc836',
  'photo-1414235077428-338989a2e8c0',
  'photo-1501281668745-f7f57925c3b4',
  'photo-1470229722913-7c0e2dbbafd3',
  'photo-1441974231531-c6227db76b6e',
  'photo-1518173946687-a4c036bc2ee0',
  'photo-1578632767115-351597cf2477',
  'photo-1612036782180-6f0b06ea7512',
  'photo-1516589176970-021cd9f9f2f5',
  'photo-1524504388940-b1c1722653e1',
  'photo-1626814020259-6a3f69abff37',
  'photo-1594908129503-9fa6f2d06d5a',
]

const VERTICAL_POSTERS = [
  'photo-1516589176970-021cd9f9f2f5',
  'photo-1524504388940-b1c1722653e1',
  'photo-1494790108377-be9c29b29330',
  'photo-1529626455594-4ff0802cfb7e',
  'photo-1507003211169-0a1dd7228f2d',
]

function hashSeed(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

export function posterUrlForId(id: string, vertical = false) {
  const pool = vertical ? VERTICAL_POSTERS : POSTERS
  const photoId = pool[hashSeed(id) % pool.length]
  const size = vertical ? 'w=400&h=711' : 'w=400&h=600'
  return `https://images.unsplash.com/${photoId}?${size}&fit=crop&q=80`
}

export function backdropUrlForId(id: string) {
  const photoId = POSTERS[hashSeed(`${id}-backdrop`) % POSTERS.length]
  return `https://images.unsplash.com/${photoId}?w=1600&h=900&fit=crop&q=80`
}

function hasUsableImage(url?: string | null) {
  if (!url?.trim()) return false
  if (url.includes('placeholder')) return false
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
}

export function resolveContentImages(row: ContentRow) {
  const vertical = row.video_format === 'vertical'
  const poster = hasUsableImage(row.poster) ? row.poster : posterUrlForId(row.id, vertical)
  const backdrop = vertical
    ? poster
    : hasUsableImage(row.backdrop) && !row.backdrop?.includes('h=600')
      ? row.backdrop
      : backdropUrlForId(row.id)

  return { poster, backdrop }
}
