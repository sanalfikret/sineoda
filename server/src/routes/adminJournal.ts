import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapJournalPost } from '../mappers.js'
import { uniqueJournalSlug } from '../journalSeed.js'
import { loadJournalPinIds, saveJournalPinIds, MAX_JOURNAL_PINS } from '../services/journalPins.js'
import type { JournalPostRow } from '../types.js'
import { BRAND_NAME } from '../constants/brand.js'

const router = Router()

router.use(requireAdmin)

function parseStatus(value: unknown): 'draft' | 'published' {
  return value === 'published' ? 'published' : 'draft'
}

function withPinMeta(posts: ReturnType<typeof mapJournalPost>[]) {
  const pinOrder = new Map(loadJournalPinIds().map((id, index) => [id, index]))
  return posts.map((post) => ({
    ...post,
    pinnedOrder: pinOrder.has(post.id) ? pinOrder.get(post.id)! + 1 : null,
  }))
}

router.get('/pins', (_req: AuthRequest, res) => {
  res.json({ pinnedIds: loadJournalPinIds(), maxPins: MAX_JOURNAL_PINS })
})

router.put('/pins', (req: AuthRequest, res) => {
  const raw = req.body.pinnedIds ?? req.body.postIds ?? req.body.ids
  if (!Array.isArray(raw)) {
    res.status(400).json({ error: 'pinnedIds dizisi gerekli.' })
    return
  }

  if (raw.length > MAX_JOURNAL_PINS) {
    res.status(400).json({ error: `En fazla ${MAX_JOURNAL_PINS} yazı sabitlenebilir.` })
    return
  }

  const pinnedIds = saveJournalPinIds(raw.map(String))
  res.json({ pinnedIds, maxPins: MAX_JOURNAL_PINS })
})

router.get('/', (_req: AuthRequest, res) => {
  const rows = dbAll<JournalPostRow>(
    'SELECT * FROM journal_posts ORDER BY updated_at DESC, created_at DESC',
  )
  res.json({ posts: withPinMeta(rows.map(mapJournalPost)), pinnedIds: loadJournalPinIds() })
})

router.get('/:id', (req: AuthRequest, res) => {
  const row = dbGet<JournalPostRow>('SELECT * FROM journal_posts WHERE id = ?', [req.params.id])
  if (!row) {
    res.status(404).json({ error: 'Yazı bulunamadı.' })
    return
  }
  res.json({ post: mapJournalPost(row) })
})

router.post('/', (req: AuthRequest, res) => {
  const title = String(req.body.title ?? '').trim()
  if (!title) {
    res.status(400).json({ error: 'Başlık gerekli.' })
    return
  }

  const now = new Date().toISOString()
  const status = parseStatus(req.body.status)
  const slug = String(req.body.slug ?? '').trim() || uniqueJournalSlug(title)
  const publishedAt =
    status === 'published'
      ? String(req.body.publishedAt ?? req.body.published_at ?? now)
      : null

  const id = uuid()
  dbRun(
    `INSERT INTO journal_posts (id, slug, title, excerpt, body, cover_image, author, content_id, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      slug,
      title,
      String(req.body.excerpt ?? '').trim(),
      String(req.body.body ?? '').trim(),
      String(req.body.coverImage ?? req.body.cover_image ?? '').trim(),
      String(req.body.author ?? BRAND_NAME).trim() || BRAND_NAME,
      req.body.contentId || req.body.content_id ? String(req.body.contentId ?? req.body.content_id) : null,
      status,
      publishedAt,
      now,
      now,
    ],
  )

  const row = dbGet<JournalPostRow>('SELECT * FROM journal_posts WHERE id = ?', [id])
  res.status(201).json({ post: mapJournalPost(row!) })
})

router.put('/:id', (req: AuthRequest, res) => {
  const existing = dbGet<JournalPostRow>('SELECT * FROM journal_posts WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Yazı bulunamadı.' })
    return
  }

  const title = req.body.title !== undefined ? String(req.body.title).trim() : existing.title
  if (!title) {
    res.status(400).json({ error: 'Başlık gerekli.' })
    return
  }

  const status = req.body.status !== undefined ? parseStatus(req.body.status) : existing.status
  const slug =
    req.body.slug !== undefined
      ? String(req.body.slug).trim() || uniqueJournalSlug(title, existing.id)
      : req.body.title !== undefined
        ? uniqueJournalSlug(title, existing.id)
        : existing.slug

  const now = new Date().toISOString()
  let publishedAt = existing.published_at
  if (status === 'published' && existing.status !== 'published') {
    publishedAt = String(req.body.publishedAt ?? req.body.published_at ?? now)
  }
  if (status === 'draft') {
    publishedAt = null
  }
  if (status === 'published' && (req.body.publishedAt !== undefined || req.body.published_at !== undefined)) {
    publishedAt = String(req.body.publishedAt ?? req.body.published_at)
  }

  dbRun(
    `UPDATE journal_posts SET slug=?, title=?, excerpt=?, body=?, cover_image=?, author=?, content_id=?, status=?, published_at=?, updated_at=? WHERE id=?`,
    [
      slug,
      title,
      req.body.excerpt !== undefined ? String(req.body.excerpt).trim() : existing.excerpt,
      req.body.body !== undefined ? String(req.body.body).trim() : existing.body,
      req.body.coverImage !== undefined || req.body.cover_image !== undefined
        ? String(req.body.coverImage ?? req.body.cover_image).trim()
        : existing.cover_image,
      req.body.author !== undefined ? String(req.body.author).trim() || BRAND_NAME : existing.author,
      req.body.contentId !== undefined || req.body.content_id !== undefined
        ? req.body.contentId || req.body.content_id
          ? String(req.body.contentId ?? req.body.content_id)
          : null
        : existing.content_id,
      status,
      publishedAt,
      now,
      existing.id,
    ],
  )

  const row = dbGet<JournalPostRow>('SELECT * FROM journal_posts WHERE id = ?', [existing.id])
  res.json({ post: mapJournalPost(row!) })
})

router.delete('/:id', (req: AuthRequest, res) => {
  const existing = dbGet('SELECT id FROM journal_posts WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Yazı bulunamadı.' })
    return
  }
  dbRun('DELETE FROM journal_posts WHERE id = ?', [req.params.id])
  saveJournalPinIds(loadJournalPinIds().filter((id) => id !== req.params.id))
  res.json({ ok: true })
})

export default router
