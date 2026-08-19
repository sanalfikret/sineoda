import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { slugify } from '../mappers.js'
import { resetContent } from '../seed.js'

const router = Router()

router.get('/', (_req, res) => {
  const categories = dbAll<{ id: string; title: string; sort_order: number }>(
    'SELECT * FROM categories ORDER BY sort_order, title',
  )
  const items = dbAll<{ category_id: string; content_id: string; sort_order: number }>(
    'SELECT category_id, content_id, sort_order FROM category_items ORDER BY sort_order',
  )

  res.json({
    categories: categories.map((category) => ({
      id: category.id,
      title: category.title,
      itemIds: items
        .filter((item) => item.category_id === category.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => item.content_id),
    })),
  })
})

router.post('/', requireAdmin, (req: AuthRequest, res) => {
  const title = String(req.body.title ?? '').trim()
  if (!title) {
    res.status(400).json({ error: 'Kategori adı zorunlu.' })
    return
  }

  const id = slugify(title) || uuid()
  const maxOrder = dbGet<{ max: number | null }>('SELECT MAX(sort_order) as max FROM categories')
  dbRun('INSERT INTO categories (id, title, sort_order) VALUES (?, ?, ?)', [
    id, title, (maxOrder?.max ?? -1) + 1,
  ])
  res.status(201).json({ category: { id, title, itemIds: [] } })
})

router.put('/reorder', requireAdmin, (req: AuthRequest, res) => {
  const orderedIds = req.body.orderedIds
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400).json({ error: 'orderedIds dizisi zorunlu.' })
    return
  }

  orderedIds.forEach((id: string, index: number) => {
    dbRun('UPDATE categories SET sort_order = ? WHERE id = ?', [index, String(id)])
  })

  res.json({ ok: true })
})

router.patch('/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet('SELECT * FROM categories WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Kategori bulunamadı.' })
    return
  }

  if (req.body.title !== undefined) {
    dbRun('UPDATE categories SET title = ? WHERE id = ?', [String(req.body.title), req.params.id])
  }

  if (Array.isArray(req.body.itemIds)) {
    dbRun('DELETE FROM category_items WHERE category_id = ?', [req.params.id])
    req.body.itemIds.forEach((contentId: string, index: number) => {
      dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
        req.params.id, contentId, index,
      ])
    })
  }

  const category = dbGet<{ id: string; title: string }>('SELECT * FROM categories WHERE id = ?', [
    req.params.id,
  ])!
  const itemIds = dbAll<{ content_id: string }>(
    'SELECT content_id FROM category_items WHERE category_id = ? ORDER BY sort_order',
    [req.params.id],
  ).map((row) => row.content_id)

  res.json({ category: { ...category, itemIds } })
})

router.delete('/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet('SELECT id FROM categories WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Kategori bulunamadı.' })
    return
  }
  dbRun('DELETE FROM categories WHERE id = ?', [req.params.id])
  res.status(204).send()
})

router.post('/reset', requireAdmin, (_req: AuthRequest, res) => {
  resetContent()
  res.json({ ok: true })
})

export default router
