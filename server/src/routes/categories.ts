import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { slugify } from '../mappers.js'
import { resetContent } from '../seed.js'
import { fillCategoriesToTarget } from '../services/categoryFill.js'
import { mapCategoriesResponse, removeCategoryFromOrder, saveCategoryOrder, appendCategoryToOrder } from '../services/categoryOrder.js'

const router = Router()

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ categories: mapCategoriesResponse() })
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
  appendCategoryToOrder(id)
  res.status(201).json({ category: { id, title, itemIds: [] } })
})

router.put('/reorder', requireAdmin, (req: AuthRequest, res) => {
  const orderedIds = req.body.orderedIds
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400).json({ error: 'orderedIds dizisi zorunlu.' })
    return
  }

  saveCategoryOrder(orderedIds.map(String))
  res.json({ ok: true, categories: mapCategoriesResponse() })
})

router.post('/fill', requireAdmin, (_req: AuthRequest, res) => {
  fillCategoriesToTarget()
  res.json({ ok: true, categories: mapCategoriesResponse() })
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

  const category = mapCategoriesResponse().find((entry) => entry.id === req.params.id)
  if (!category) {
    res.status(404).json({ error: 'Kategori bulunamadı.' })
    return
  }

  res.json({ category })
})

router.delete('/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = dbGet('SELECT id FROM categories WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Kategori bulunamadı.' })
    return
  }
  removeCategoryFromOrder(req.params.id)
  dbRun('DELETE FROM categories WHERE id = ?', [req.params.id])
  res.status(204).send()
})

router.post('/reset', requireAdmin, (_req: AuthRequest, res) => {
  resetContent()
  res.json({ ok: true })
})

export default router
