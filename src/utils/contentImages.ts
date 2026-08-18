import type { ContentItem } from '../types/content'

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
]

const VERTICAL_POSTERS = [
  'photo-1516589176970-021cd9f9f2f5',
  'photo-1524504388940-b1c1722653e1',
  'photo-1494790108377-be9c29b29330',
  'photo-1529626455594-4ff0802cfb7e',
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

function hasImage(url?: string) {
  return Boolean(url?.trim())
}

export function enrichContentImages(item: ContentItem, fallback?: ContentItem): ContentItem {
  const vertical = item.videoFormat === 'vertical'
  const poster = hasImage(item.poster)
    ? item.poster
    : hasImage(fallback?.poster)
      ? fallback!.poster
      : posterUrlForId(item.id, vertical)
  const backdrop = vertical
    ? poster
    : hasImage(item.backdrop)
      ? item.backdrop
      : hasImage(fallback?.backdrop) && !fallback?.backdrop?.includes('h=600')
        ? fallback!.backdrop
        : hasImage(fallback?.poster) && fallback!.poster !== poster
          ? fallback!.poster
          : backdropUrlForId(item.id)

  return {
    ...item,
    poster,
    backdrop,
  }
}

export function enrichCatalogImages(catalog: ContentItem[]): ContentItem[] {
  return catalog.map((item) => enrichContentImages(item))
}
