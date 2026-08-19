import { dbAll, dbRun } from './db.js'
import { posterUrlForId, backdropUrlForId } from './services/contentImages.js'

export function backfillMissingImages() {
  const rows = dbAll<{ id: string; poster: string | null; backdrop: string | null; video_format: string | null }>(
    'SELECT id, poster, backdrop, video_format FROM content',
  )

  for (const row of rows) {
    const vertical = row.video_format === 'vertical'
    const posterMissing = !row.poster?.trim() || row.poster.includes('placeholder')
    const backdropMissing =
      !row.backdrop?.trim() ||
      row.backdrop.includes('placeholder') ||
      (!vertical && row.backdrop.includes('h=600') && row.backdrop === row.poster)

    const poster = posterMissing ? posterUrlForId(row.id, vertical) : row.poster!
    const backdrop = vertical
      ? poster
      : backdropMissing
        ? backdropUrlForId(row.id)
        : row.backdrop!

    if (poster !== row.poster || backdrop !== row.backdrop) {
      dbRun('UPDATE content SET poster = ?, backdrop = ? WHERE id = ?', [poster, backdrop, row.id])
    }
  }
}
