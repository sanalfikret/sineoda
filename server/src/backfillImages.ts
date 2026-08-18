import { dbAll, dbRun } from './db.js'

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
]

function hashSeed(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function posterUrl(id: string, vertical = false) {
  const photoId = POSTERS[hashSeed(id) % POSTERS.length]
  const size = vertical ? 'w=400&h=711' : 'w=400&h=600'
  return `https://images.unsplash.com/${photoId}?${size}&fit=crop&q=80`
}

function backdropUrl(id: string) {
  const photoId = POSTERS[hashSeed(`${id}-backdrop`) % POSTERS.length]
  return `https://images.unsplash.com/${photoId}?w=1600&h=900&fit=crop&q=80`
}

export function backfillMissingImages() {
  const rows = dbAll<{ id: string; poster: string | null; backdrop: string | null; video_format: string | null }>(
    'SELECT id, poster, backdrop, video_format FROM content',
  )

  for (const row of rows) {
    const vertical = row.video_format === 'vertical'
    const poster = row.poster?.trim() ? row.poster : posterUrl(row.id, vertical)
    const backdrop = vertical
      ? poster
      : row.backdrop?.trim() && !row.backdrop.includes('h=600')
        ? row.backdrop
        : backdropUrl(row.id)

    if (poster !== row.poster || backdrop !== row.backdrop) {
      dbRun('UPDATE content SET poster = ?, backdrop = ? WHERE id = ?', [poster, backdrop, row.id])
    }
  }
}
