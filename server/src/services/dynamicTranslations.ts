import { dbAll, dbGet, dbRunNoPersist, dbTransaction } from '../db.js'
export type TranslationKind = 'content' | 'categories'
export function readTranslations(kind: TranslationKind, id: string) {
  return Object.fromEntries(dbAll<{ locale: string; title: string; description: string }>('SELECT locale, title, description FROM dynamic_translations WHERE entity_type = ? AND entity_id = ?', [kind, id]).map(r => [r.locale, { title: r.title, description: r.description }]))
}
export function validateTranslations(kind: TranslationKind, id: string, value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('TR ve EN alanları gereklidir.')
  const entries = ['tr', 'en'].map(locale => {
    const entry = (value as Record<string, { title?: unknown; description?: unknown }>)[locale]
    if (!entry || typeof entry.title !== 'string' || typeof entry.description !== 'string' || !entry.title.trim()) throw new Error('TR ve EN başlıkları zorunludur.')
    if (entry.title.length > 500 || entry.description.length > 20000) throw new Error('İçerik çok uzun.')
    return [kind, id, locale, entry.title.trim(), entry.description.trim()]
  })
  return entries
}
export function saveTranslations(kind: TranslationKind, id: string, value: unknown) {
  const entries = validateTranslations(kind, id, value)
  if (!dbGet('SELECT id FROM ' + kind + ' WHERE id = ?', [id])) throw new Error('Kayıt bulunamadı.')
  dbTransaction(() => { for (const entry of entries) dbRunNoPersist('INSERT OR REPLACE INTO dynamic_translations (entity_type, entity_id, locale, title, description) VALUES (?, ?, ?, ?, ?)', entry) })
}
