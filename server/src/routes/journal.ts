import { Router } from 'express'
import { dbGet } from '../db.js'
import { mapJournalPost } from '../mappers.js'
import { listPublishedJournalPostsPage } from '../services/journalList.js'
import { JOURNAL_PUBLISHED_SQL } from '../services/publish.js'
import type { JournalPostRow } from '../types.js'

const router = Router()

router.get('/', (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? req.query.pageSize ?? undefined)
  res.json(listPublishedJournalPostsPage(page, Number.isFinite(limit) && limit > 0 ? limit : undefined))
})

router.get('/:slug', (req, res) => {
  const row = dbGet<JournalPostRow>(
    `SELECT * FROM journal_posts WHERE slug = ? AND ${JOURNAL_PUBLISHED_SQL}`,
    [req.params.slug],
  )
  if (!row) {
    res.status(404).json({ error: 'Yazı bulunamadı.' })
    return
  }
  res.json({ post: mapJournalPost(row) })
})

export default router
