import { BRAND_EDITOR, BRAND_NAME } from '../constants/brand.js'
import { dbAll, dbRun } from '../db.js'

/** Eski marka metinlerini Plooy ile değiştir (yalnızca görünen içerik alanları). */
function replaceLegacyBrandText(text: string) {
  return text
    .replace(/Sineoda Editör/gi, BRAND_EDITOR)
    .replace(/SINEODA DERGİ/g, `${BRAND_NAME} Dergi`.toUpperCase())
    .replace(/Sineoda Dergi/gi, `${BRAND_NAME} Dergi`)
    .replace(/SINEODA/g, BRAND_NAME.toUpperCase())
    .replace(/Sineoda/g, BRAND_NAME)
}

function containsLegacyBrand(text: string) {
  return /sineoda/i.test(text)
}

/** Canlı DB'deki eski Sineoda metinlerini güncelle — deploy sonrası bir kez yeterli, idempotent. */
export function migrateLegacyBrandText() {
  const posts = dbAll<{ id: string; author: string; excerpt: string; body: string; title: string }>(
    'SELECT id, author, excerpt, body, title FROM journal_posts',
  )

  for (const post of posts) {
    if (
      !containsLegacyBrand(post.author) &&
      !containsLegacyBrand(post.excerpt) &&
      !containsLegacyBrand(post.body) &&
      !containsLegacyBrand(post.title)
    ) {
      continue
    }

    dbRun('UPDATE journal_posts SET author = ?, excerpt = ?, body = ?, title = ? WHERE id = ?', [
      replaceLegacyBrandText(post.author),
      replaceLegacyBrandText(post.excerpt),
      replaceLegacyBrandText(post.body),
      replaceLegacyBrandText(post.title),
      post.id,
    ])
  }

  const settings = dbAll<{ key: string; value: string }>('SELECT key, value FROM site_settings')
  for (const row of settings) {
    if (!containsLegacyBrand(row.value)) continue
    dbRun('UPDATE site_settings SET value = ? WHERE key = ?', [
      replaceLegacyBrandText(row.value),
      row.key,
    ])
  }

  dbRun('UPDATE content SET description = replace(description, ?, ?) WHERE description LIKE ?', [
    'Sineoda',
    BRAND_NAME,
    '%Sineoda%',
  ])
  dbRun('UPDATE content SET title = replace(title, ?, ?) WHERE title LIKE ?', [
    'Sineoda',
    BRAND_NAME,
    '%Sineoda%',
  ])
}
