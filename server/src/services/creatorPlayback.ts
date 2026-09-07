import type { ContentRow } from '../types.js'
export function assertCreatorPlayback(row: ContentRow, status: string) {
  if (!row.creator_id || status !== 'published') return
  let valid = false
  try {
    const url = new URL(row.video_url)
    valid = url.protocol === 'https:' && url.hostname.endsWith('.b-cdn.net') && !url.username && !url.password && /^\/[a-f0-9-]{36}\/playlist\.m3u8$/i.test(url.pathname) && row.video_url !== row.source_video_url
  } catch { /* Missing or invalid playback URL. */ }
  if (!valid) throw new Error('Yayın için Bunny sunucu adresi ve video ID ekleyin. Teslim linki yayın videosu olarak kullanılamaz.')
}
