import { v4 as uuid } from 'uuid'
import { CEKIM_NOTLARI_CATEGORIES } from '../constants/cekimNotlari.js'
import { dbAll, dbGet, dbRun } from '../db.js'
import { addToCekimCategory, SHOOTING_NOTES_PROGRAM } from './cekimNotlari.js'

const V = {
  bunny: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  sintel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  tears: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
}

const EXPERTS = [
  'Ayşe Kaya',
  'Mehmet Demir',
  'Zeynep Arslan',
]

const BACKDROPS = [
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&h=900&fit=crop',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600&h=900&fit=crop',
  'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&h=900&fit=crop',
]

const POSTERS = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1535016120720-40c6464ebe02?w=400&h=600&fit=crop',
]

const VIDEO_ROTATION = [V.tears, V.sintel, V.bunny]

function demoContentId(categoryId: string, index: number) {
  return `${categoryId}-demo-${String(index + 1).padStart(2, '0')}`
}

export function ensureCekimNotlariDemoContent() {
  const now = new Date().toISOString()

  const categories = dbAll<{ id: string; title: string }>(
    `SELECT id, title FROM categories WHERE id LIKE 'cekim-%' ORDER BY sort_order, title`,
  )

  const targets = categories.length > 0 ? categories : CEKIM_NOTLARI_CATEGORIES.map((c) => ({ id: c.id, title: c.title }))

  for (const category of targets) {
    for (let index = 0; index < 3; index += 1) {
      const id = demoContentId(category.id, index)
      const title = `${category.title} — Ders ${index + 1}`
      const expert = EXPERTS[index]
      const exists = dbGet<{ id: string }>('SELECT id FROM content WHERE id = ?', [id])

      if (!exists) {
        dbRun(
          `INSERT INTO content (
            id, title, description, year, duration, rating, type, genres,
            poster, backdrop, video_url, stream_provider, video_format,
            is_new, featured, program, content_format, published_at, credits_json, festivals_json, subtitles_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            title,
            `${expert} ile ${category.title.toLowerCase()} üzerine kısa eğitim videosu.`,
            2025,
            `${8 + index * 2} dk`,
            '13+',
            'belgesel',
            JSON.stringify(['Eğitim', 'Sinema']),
            POSTERS[index],
            BACKDROPS[index],
            VIDEO_ROTATION[index],
            'custom',
            'standard',
            0,
            0,
            SHOOTING_NOTES_PROGRAM,
            'main',
            now,
            JSON.stringify({ directors: [expert], producers: [], cast: [], studio: 'Sineoda Eğitim' }),
            '[]',
            '[]',
          ],
        )
      } else {
        dbRun('UPDATE content SET program = ?, title = ?, published_at = COALESCE(published_at, ?) WHERE id = ?', [
          SHOOTING_NOTES_PROGRAM,
          title,
          now,
          id,
        ])
      }

      addToCekimCategory(id, category.id)
    }
  }
}

/** Yeni demo içerik oluştururken benzersiz id */
export function newShootingNotesContentId(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  let id = `cekim-${base || uuid().slice(0, 8)}`
  let counter = 1
  while (dbGet('SELECT id FROM content WHERE id = ?', [id])) {
    id = `cekim-${base}-${counter++}`
  }
  return id
}
