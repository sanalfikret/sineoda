import { Router, type Response } from 'express'
import { v4 as uuid } from 'uuid'
import { dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { slugify } from '../mappers.js'
import { resetContent } from '../seed.js'
import { dedupeAllCategories } from '../services/categoryDedup.js'
import { fillCategoriesToTarget } from '../services/categoryFill.js'
import { mapCategoriesResponse, removeCategoryFromOrder, saveCategoryOrder, appendCategoryToOrder } from '../services/categoryOrder.js'
import { isCekimCategoryId } from '../services/cekimNotlari.js'
import { mapSiteNavResponse, syncLinkedNavForCategory } from '../services/siteNav.js'

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
  res.status(201).json({ category: { id, title, itemIds: [], hidden: false } })
})

function reorderCategories(req: AuthRequest, res: Response) {
  const orderedIds = req.body.orderedIds
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400).json({ error: 'orderedIds dizisi zorunlu.' })
    return
  }

  saveCategoryOrder(orderedIds.map(String))
  res.json({ ok: true, categories: mapCategoriesResponse() })
}

router.put('/reorder', requireAdmin, reorderCategories)
router.patch('/reorder', requireAdmin, reorderCategories)

router.post('/dedupe', requireAdmin, (_req: AuthRequest, res) => {
  dedupeAllCategories()
  res.json({ ok: true, categories: mapCategoriesResponse() })
})

router.post('/fill', requireAdmin, (_req: AuthRequest, res) => {
  fillCategoriesToTarget()
  res.json({ ok: true, categories: mapCategoriesResponse() })
})

router.patch('/:id', requireAdmin, (req: AuthRequest, res) => {
  const categoryId = String(req.params.id)
  if (isCekimCategoryId(categoryId)) {
    res.status(400).json({ error: 'Çekim Notları kategorileri yalnızca Çekim Notları admininden düzenlenir.' })
    return
  }

  const existing = dbGet('SELECT * FROM categories WHERE id = ?', [categoryId])
  if (!existing) {
    res.status(404).json({ error: 'Kategori bulunamadı.' })
    return
  }

  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim()
    if (!title) {
      res.status(400).json({ error: 'Kategori adı boş olamaz.' })
      return
    }
    dbRun('UPDATE categories SET title = ? WHERE id = ?', [title, categoryId])
  }

  if (Array.isArray(req.body.itemIds)) {
    dbRun('DELETE FROM category_items WHERE category_id = ?', [categoryId])
    req.body.itemIds.forEach((contentId: string, index: number) => {
      dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
        categoryId, contentId, index,
      ])
    })
  }

  if (req.body.hidden !== undefined) {
    const hidden = req.body.hidden === true || req.body.hidden === 1 ? 1 : 0
    dbRun('UPDATE categories SET hidden = ? WHERE id = ?', [hidden, categoryId])
    syncLinkedNavForCategory(categoryId, hidden === 1)
  }

  const categories = mapCategoriesResponse()
  const category = categories.find((entry) => entry.id === categoryId)
  if (!category) {
    res.status(404).json({ error: 'Kategori bulunamadı.' })
    return
  }

  res.json(
    req.body.hidden !== undefined
      ? { category, categories, siteNav: mapSiteNavResponse() }
      : { category },
  )
})

router.delete('/:id', requireAdmin, (req: AuthRequest, res) => {
  const categoryId = String(req.params.id)
  if (isCekimCategoryId(categoryId)) {
    res.status(400).json({ error: 'Çekim Notları kategorileri yalnızca Çekim Notları admininden silinir.' })
    return
  }
  const existing = dbGet('SELECT id FROM categories WHERE id = ?', [categoryId])
  if (!existing) {
    res.status(404).json({ error: 'Kategori bulunamadı.' })
    return
  }
  removeCategoryFromOrder(categoryId)
  dbRun('DELETE FROM categories WHERE id = ?', [categoryId])
  res.status(204).send()
})

router.post('/reset', requireAdmin, (_req: AuthRequest, res) => {
  resetContent()
  res.json({ ok: true })
})

export default router
