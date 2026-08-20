import { dbAll, dbGet, dbRun } from '../db.js'

export function backfillEpisodeVideoUrls() {
  const rows = dbAll<{ id: string; content_id: string }>(
    `SELECT id, content_id FROM episodes
     WHERE video_url IS NULL OR TRIM(video_url) = ''`,
  )

  for (const row of rows) {
    const content = dbGet<{ video_url: string }>('SELECT video_url FROM content WHERE id = ?', [
      row.content_id,
    ])
    const fallback = content?.video_url?.trim()
    if (!fallback) continue

    dbRun('UPDATE episodes SET video_url = ? WHERE id = ?', [fallback, row.id])
  }
}
