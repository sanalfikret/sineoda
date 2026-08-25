import { dbGet, dbRun } from '../db.js'
import { CEKIM_NOTLARI_CATEGORIES } from '../constants/cekimNotlari.js'

const BASE_SORT_ORDER = 200

/** Çekim Notları alt kategorilerini oluştur / başlıkları güncelle */
export function ensureCekimNotlariCategories() {
  CEKIM_NOTLARI_CATEGORIES.forEach((category, index) => {
    const sortOrder = BASE_SORT_ORDER + index
    const existing = dbGet<{ id: string }>('SELECT id FROM categories WHERE id = ?', [category.id])
    if (existing) {
      dbRun('UPDATE categories SET title = ?, sort_order = ? WHERE id = ?', [
        category.title,
        sortOrder,
        category.id,
      ])
      return
    }
    dbRun('INSERT INTO categories (id, title, sort_order) VALUES (?, ?, ?)', [
      category.id,
      category.title,
      sortOrder,
    ])
  })
}
