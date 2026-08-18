import { Router } from 'express'
import { dbAll, dbGet } from '../db.js'
import { mapJournalPost } from '../mappers.js'
import type { JournalPostRow } from '../types.js'

const router = Router()

function publishedClause() {
  return `status = 'published' AND (published_at IS NULL OR published_at <= datetime('now'))`
}

router.get('/', (_req, res) => {
  const rows = dbAll<JournalPostRow>(
    `SELECT * FROM journal_posts WHERE ${publishedClause()} ORDER BY published_at DESC, created_at DESC`,
  )
  res.json({ posts: rows.map(mapJournalPost) })
})

router.get('/:slug', (req, res) => {
  const row = dbGet<JournalPostRow>(
    `SELECT * FROM journal_posts WHERE slug = ? AND ${publishedClause()}`,
    [req.params.slug],
  )
  if (!row) {
    res.status(404).json({ error: 'Yazı bulunamadı.' })
    return
  }
  res.json({ post: mapJournalPost(row) })
})

export default router
