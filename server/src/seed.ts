import { EDITORIAL_CATEGORY_ROWS } from './editorialCategories.js'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { TURKEY_FILM_SCHOOLS } from './turkeyFilmSchools.js'
import { BRAND_NAME, BRAND_STUDIOS } from './constants/brand.js'
import { contactEmails } from './constants/contact.js'
import { config } from './config.js'
import { dbAll, dbExec, dbGet, dbRun } from './db.js'
import { allowDemoAccountSeed, preserveExistingContent } from './services/seedPolicy.js'
import { parseCredits, serializeCredits } from './services/credits.js'
import type { UserRow } from './types.js'

const V = {
  bunny: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  elephants: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  blazes: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  escapes: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  fun: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  joyrides: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  meltdowns: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  sintel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  subaru: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  tears: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
}

const SEED_CONTENT = [
  ['aurora-dreams', 'Aurora Rüyaları', 'Kuzey ışıklarının altında geçen duygusal yolculuk.', 2025, '2s 14dk', '13+', 'film', '["Dram","Bilim Kurgu"]', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600&h=900&fit=crop', V.tears, 1],
  ['midnight-istanbul', 'Gece Yarısı İstanbul', 'Bir müzisyenin şehirde kendini bulma hikayesi.', 2024, '1s 58dk', '16+', 'film', '["Dram","Müzikal","Klasik"]', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&h=900&fit=crop', V.sintel, 0],
  ['silent-forest', 'Sessiz Orman', 'Kaybolan bir köyün sırrını çözen belgesel ekibi.', 2023, '1s 42dk', '18+', 'film', '["Gerilim","Korku","Gizem"]', 'https://images.unsplash.com/photo-1509281373367-fa7cf25a27f8?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&h=900&fit=crop', V.elephants, 0],
  ['ocean-whispers', 'Okyanus Fısıltıları', 'Derin denizlerde keşfedilen antik medeniyet.', 2025, '2s 5dk', '13+', 'film', '["Macera","Fantastik"]', 'https://images.unsplash.com/photo-1535016120720-40c6464ebe02?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&h=900&fit=crop', V.escapes, 0],
  ['code-breakers', 'Kod Kırıcılar', 'Hacker ekibi küresel siber saldırıyı durdurmaya çalışır.', 2024, '8 bölüm', '13+', 'dizi', '["Aksiyon","Dizi"]', 'https://images.unsplash.com/photo-1611162617474-5b21e939e113?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=900&fit=crop', V.blazes, 0],
  ['golden-era', 'Altın Çağ', '1950ler sinemasının perde arkası.', 2022, '1s 28dk', 'Genel', 'belgesel', '["Belgesel","Tarih"]', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600&h=900&fit=crop', V.bunny, 0],
  ['wind-road', 'Rüzgar Yolu', 'Anadoluda geçen sıcak bir aile draması.', 2023, '1s 52dk', '13+', 'film', '["Dram","Yerli","Klasik"]', 'https://images.unsplash.com/photo-1594909128353-aa2d4ae0e8fb?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=900&fit=crop', V.subaru, 0],
  ['neon-pulse', 'Neon Nabız', 'Geleceğin şehrinde bir dedektifin vakası.', 2025, '10 bölüm', '16+', 'dizi', '["Noir","Dizi"]', 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=900&fit=crop', V.meltdowns, 0],
  ['little-stars', 'Küçük Yıldızlar', 'Genç bir astronot adayının hikayesi.', 2024, '1s 36dk', 'Genel', 'film', '["Aile","Komedi","Macera"]', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1419242902214-272b4f66ee7a?w=1600&h=900&fit=crop', V.fun, 0],
  ['chef-table', 'Şef Masası', 'Dünyadan şeflerin mutfak felsefeleri.', 2023, '6 bölüm', 'Genel', 'dizi', '["Belgesel","Komedi","Yemek"]', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop', V.joyrides, 0],
  ['stage-lights', 'Sahne Işıkları', 'Türkiye\'nin en sevilen komedyenlerinden unutulmaz bir stand-up gecesi.', 2024, '1s 12dk', '16+', 'stand-up', '["Stand-up","Komedi"]', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&h=900&fit=crop', V.fun, 0],
  ['wild-planet', 'Vahşi Gezegen', 'Dünyanın en uzak köşelerinde doğanın sırları.', 2023, '1s 35dk', 'Genel', 'belgesel', '["Belgesel","Doğa"]', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1518173946687-a4c036bc2ee0?w=1600&h=900&fit=crop', V.elephants, 0],
  ['anime-horizon', 'Anime Ufku', 'Geleceğin savaşçılarının epik macerası.', 2025, '12 bölüm', '13+', 'dizi', '["Anime","Aksiyon","Bilim Kurgu"]', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1612036782180-6f0b06ea7512?w=1600&h=900&fit=crop', V.sintel, 0],
] as const

const SEED_CATEGORIES = EDITORIAL_CATEGORY_ROWS.map(
  (row) => [row.id, row.title, row.sortOrder, row.seedItems] as const,
)

export function ensureGenreCategories() {
  ensureCatalogCategories()
}

function legacyGenreRowId(legacyId: string) {
  if (!legacyId.startsWith('genre-') || legacyId.startsWith('genre-row-')) return null
  return `genre-row-${legacyId.slice('genre-'.length)}`
}

function upsertCategory(id: string, title: string, sortOrder: number) {
  const rowId = legacyGenreRowId(id)
  if (rowId && dbGet('SELECT id FROM categories WHERE id = ?', [rowId])) {
    return
  }

  const exists = dbGet('SELECT id FROM categories WHERE id = ?', [id])
  if (exists) {
    return
  }
  dbRun('INSERT INTO categories (id, title, sort_order) VALUES (?, ?, ?)', [id, title, sortOrder])
}

function ensureCategoryItems(categoryId: string, items: readonly string[]) {
  for (const [index, contentId] of items.entries()) {
    const contentExists = dbGet('SELECT id FROM content WHERE id = ?', [contentId])
    if (!contentExists) continue
    const linked = dbGet(
      'SELECT content_id FROM category_items WHERE category_id = ? AND content_id = ?',
      [categoryId, contentId],
    )
    if (linked) continue
    const maxOrder = dbGet<{ max_order: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM category_items WHERE category_id = ?',
      [categoryId],
    )
    dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
      categoryId,
      contentId,
      (maxOrder?.max_order ?? -1) + 1,
    ])
  }
}

export function ensureCatalogCategories() {
  for (const [id, title, order, items] of SEED_CATEGORIES) {
    upsertCategory(id, title, order)
    ensureCategoryItems(id, items)
  }
}

export function ensureExtraSeedContent() {
  const extras = [
    ['stage-lights', 'Sahne Işıkları', 'Türkiye\'nin en sevilen komedyenlerinden unutulmaz bir stand-up gecesi.', 2024, '1s 12dk', '16+', 'stand-up', '["Stand-up","Komedi"]', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&h=900&fit=crop', V.fun, 0],
    ['wild-planet', 'Vahşi Gezegen', 'Dünyanın en uzak köşelerinde doğanın sırları.', 2023, '1s 35dk', 'Genel', 'belgesel', '["Belgesel","Doğa"]', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1518173946687-a4c036bc2ee0?w=1600&h=900&fit=crop', V.elephants, 0],
    ['anime-horizon', 'Anime Ufku', 'Geleceğin savaşçılarının epik macerası.', 2025, '12 bölüm', '13+', 'dizi', '["Anime","Aksiyon","Bilim Kurgu"]', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1612036782180-6f0b06ea7512?w=1600&h=900&fit=crop', V.sintel, 0],
  ] as const

  for (const row of extras) {
    const exists = dbGet('SELECT id FROM content WHERE id = ?', [row[0]])
    if (exists) continue
    dbRun(
      `INSERT INTO content (id, title, description, year, duration, rating, type, genres, poster, backdrop, video_url, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...row],
    )
  }
}

export function ensureVerticalSeries() {
  const id = 'kalp-satirlari'
  const exists = dbGet('SELECT id FROM content WHERE id = ?', [id])
  if (!exists) {
    dbRun(
      `INSERT INTO content (id, title, description, year, duration, rating, type, genres, poster, backdrop, video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom', ?, 'vertical', 1, ?, 0)`,
      [
        id,
        'Kalp Satırları',
        'Üniversite kampüsünde geçen, mobil öncelikli dikey format romantik dizi. Her bölüm tek ekranda, hızlı ve duygusal.',
        2025,
        '40 bölüm',
        '13+',
        'dizi',
        '["Romantik","Dram","Dikey"]',
        'https://images.unsplash.com/photo-1516589176970-021cd9f9f2f5?w=400&h=711&fit=crop',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&h=1600&fit=crop',
        V.fun,
        V.joyrides,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ],
    )
  } else if (!preserveExistingContent()) {
    dbRun(
      'UPDATE content SET video_format = ?, is_new = 1, new_until = ? WHERE id = ?',
      ['vertical', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), id],
    )
  }

  const categoryId = 'vertical-series'
  upsertCategory(categoryId, 'Dikey Diziler', 8)
  ensureCategoryItems(categoryId, [id])

  const episodeCount = dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM episodes WHERE content_id = ?',
    [id],
  )
  if ((episodeCount?.count ?? 0) === 0) {
    const verticalEpisodes = [
      [1, 'İlk Mesaj', 'Bilinmeyen numaradan gelen mesaj her şeyi değiştirir.', '3 dk', V.fun],
      [2, 'Kampüs', 'Yeni dönem, yeni yüzler.', '4 dk', V.joyrides],
      [3, 'Sır', 'Geçmişin gölgeleri ortaya çıkıyor.', '4 dk', V.blazes],
      [4, 'Yanlış Anlaşılma', 'Bir mesaj yanlış kişiye gider.', '3 dk', V.meltdowns],
      [5, 'İtiraf', 'Duygular artık saklanamaz.', '5 dk', V.escapes],
      [6, 'Ayrılık', 'Zor bir karar verilir.', '4 dk', V.tears],
      [7, 'Umut', 'Yeni bir başlangıç kapısı aralanır.', '4 dk', V.bunny],
      [8, 'Final', 'Sezon finali: her şey yerli yerine oturur.', '6 dk', V.sintel],
    ] as const

    for (const [episode, title, description, duration, videoUrl] of verticalEpisodes) {
      dbRun(
        `INSERT INTO episodes (id, content_id, season, episode_number, title, description, duration, video_url, stream_provider, sort_order)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'custom', ?)`,
        [uuid(), id, episode, title, description, duration, videoUrl, episode - 1],
      )
    }
  }
}

export function ensureContentMeta() {
  const rows = dbAll<{ id: string; video_url: string }>(
    "SELECT id, video_url FROM content WHERE trailer_url IS NULL OR trailer_url = ''",
  )
  for (const row of rows) {
    dbRun('UPDATE content SET trailer_url = ? WHERE id = ?', [row.video_url, row.id])
  }

  const newIds = ['aurora-dreams', 'neon-pulse', 'ocean-whispers', 'little-stars', 'kalp-satirlari', 'stage-lights', 'anime-horizon']
  if (!preserveExistingContent()) {
    for (const id of newIds) {
      const exists = dbGet('SELECT id FROM content WHERE id = ?', [id])
      if (!exists) continue
      dbRun('UPDATE content SET is_new = 1, new_until = ? WHERE id = ?', [
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        id,
      ])
    }
    ensureContentTypes()
  }

  ensureSeedCredits()
}

function ensureContentTypes() {
  if (preserveExistingContent()) return
  const updates: Array<[string, string]> = [
    ['golden-era', 'belgesel'],
    ['wild-planet', 'belgesel'],
  ]
  for (const [id, type] of updates) {
    const exists = dbGet('SELECT id FROM content WHERE id = ?', [id])
    if (!exists) continue
    dbRun('UPDATE content SET type = ? WHERE id = ?', [type, id])
  }
}

const SEED_CREDITS: Record<string, string> = {
  'aurora-dreams': JSON.stringify({
    directors: ['Elif Yılmaz'],
    producers: [`${BRAND_NAME} Originals`],
    cast: ['Deniz Aksoy', 'Merve Çelik', 'Burak Kaya'],
    studio: BRAND_STUDIOS,
    audioLanguages: ['Türkçe'],
    subtitleLanguages: ['Türkçe', 'Türkçe [CC]', 'English'],
  }),
  'midnight-istanbul': JSON.stringify({
    directors: ['Can Demir'],
    producers: ['İstanbul Yapım'],
    cast: ['Ayşe Arslan', 'Kerem Öztürk', 'Selin Aydın'],
    studio: 'Gece Yapım',
    audioLanguages: ['Türkçe'],
    subtitleLanguages: ['Türkçe', 'English'],
  }),
  'code-breakers': JSON.stringify({
    directors: ['Mert Şahin', 'Zeynep Koç'],
    producers: ['Cyber Films'],
    cast: ['Emre Yıldız', 'Cansu Polat', 'Onur Tekin'],
    studio: `${BRAND_NAME} Originals`,
    audioLanguages: ['Türkçe'],
    subtitleLanguages: ['Türkçe', 'Türkçe [CC]'],
  }),
  'neon-pulse': JSON.stringify({
    directors: ['Arda Güneş'],
    producers: ['Neon Media'],
    cast: ['Gizem Er', 'Tolga Aslan', 'Ece Baran'],
    studio: 'Neon Media',
    audioLanguages: ['Türkçe'],
    subtitleLanguages: ['Türkçe', 'English'],
  }),
  'kalp-satirlari': JSON.stringify({
    directors: ['Selin Kara'],
    producers: ['Dikey Yapım'],
    cast: ['Buse Nur', 'Kaan Efe', 'Melis Ar'],
    studio: 'Dikey Yapım',
    audioLanguages: ['Türkçe'],
    subtitleLanguages: ['Türkçe', 'Türkçe [CC]'],
  }),
}

function ensureSeedCredits() {
  for (const [id, creditsJson] of Object.entries(SEED_CREDITS)) {
    const row = dbGet<{ credits_json?: string }>(
      'SELECT credits_json FROM content WHERE id = ?',
      [id],
    )
    if (!row) continue
    if (row.credits_json && row.credits_json !== '{}') continue
    dbRun('UPDATE content SET credits_json = ? WHERE id = ?', [creditsJson, id])
  }
}

export function seedEpisodes() {
  const count = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM episodes')
  if ((count?.count ?? 0) > 0) return

  const episodes = [
    ['code-breakers', 1, 1, 'Sıfır Gün', 'Küresel siber saldırı başlıyor.', '48 dk', V.blazes],
    ['code-breakers', 1, 2, 'İz Bırakmadan', 'Ekip saldırganları takip ediyor.', '51 dk', V.fun],
    ['code-breakers', 1, 3, 'Son Şifre', 'Her şey bir şifreye bağlı.', '54 dk', V.meltdowns],
    ['neon-pulse', 1, 1, 'Neon Şehir', 'Dedektif ilk ipucunu buluyor.', '42 dk', V.meltdowns],
    ['neon-pulse', 1, 2, 'Gölgeler', 'Şehrin karanlık yüzü ortaya çıkıyor.', '45 dk', V.joyrides],
    ['chef-table', 1, 1, 'İstanbul', 'Yerel lezzetlerin hikayesi.', '38 dk', V.joyrides],
    ['chef-table', 1, 2, 'Ege', 'Zeytinyağı ve deniz.', '40 dk', V.bunny],
  ] as const

  for (const [contentId, season, episode, title, description, duration, videoUrl] of episodes) {
    dbRun(
      `INSERT INTO episodes (id, content_id, season, episode_number, title, description, duration, video_url, stream_provider, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'custom', ?)`,
      [uuid(), contentId, season, episode, title, description, duration, videoUrl, episode - 1],
    )
  }
}

const DEFAULT_ADMIN_EMAIL = contactEmails.admin
const LEGACY_ADMIN_EMAIL = 'admin@sineoda.com'
const DEFAULT_ADMIN_ID = 'plooy-admin'

export function migrateLegacyBrandAccounts() {
  dbRun('UPDATE users SET email = ? WHERE email = ?', [DEFAULT_ADMIN_EMAIL, LEGACY_ADMIN_EMAIL])
  dbRun('UPDATE users SET email = ? WHERE email = ?', [contactEmails.demo, 'demo@sineoda.com'])
  dbRun("UPDATE users SET name = ? WHERE name = 'Sineoda Admin'", [`${BRAND_NAME} Admin`])
}

export function ensureDefaultAdmin() {
  migrateLegacyBrandAccounts()
  const existing =
    dbGet<UserRow>('SELECT * FROM users WHERE email = ?', [DEFAULT_ADMIN_EMAIL]) ??
    dbGet<UserRow>('SELECT * FROM users WHERE email = ?', [LEGACY_ADMIN_EMAIL])
  if (!existing) {
    const bootstrapPass = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim()
    const adminPassword =
      config.isProduction && bootstrapPass
        ? bootstrapPass
        : config.isProduction
          ? null
          : 'admin123'

    if (!adminPassword) {
      console.warn(
        '[seed] Production: admin yok. .env içine ADMIN_BOOTSTRAP_PASSWORD=admin123 yazın veya deploy/bootstrap-admin.sh çalıştırın.',
      )
      return
    }

    const adminHash = bcrypt.hashSync(adminPassword, 10)
    dbRun(
      'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [DEFAULT_ADMIN_ID, `${BRAND_NAME} Admin`, DEFAULT_ADMIN_EMAIL, adminHash, 'admin', new Date().toISOString()],
    )
    return
  }

  if (existing.email === LEGACY_ADMIN_EMAIL) {
    dbRun('UPDATE users SET email = ? WHERE id = ?', [DEFAULT_ADMIN_EMAIL, existing.id])
  }

  if (existing.role !== 'admin') {
    dbRun('UPDATE users SET role = ? WHERE id = ?', ['admin', existing.id])
  }
}

export function seedDatabase() {
  ensureDefaultAdmin()

  const userCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM users')
  if (allowDemoAccountSeed() && (userCount?.count ?? 0) <= 1) {
    const demoHash = bcrypt.hashSync('demo1234', 10)
    const demoId = uuid()
    dbRun(
      'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [demoId, 'Demo Kullanıcı', contactEmails.demo, demoHash, 'user', new Date().toISOString()],
    )
    dbRun('INSERT INTO profiles (id, user_id, name, avatar, is_kids) VALUES (?, ?, ?, ?, ?)', [
      uuid(), demoId, 'Ana Profil', '🎬', 0,
    ])
    dbRun('INSERT INTO profiles (id, user_id, name, avatar, is_kids) VALUES (?, ?, ?, ?, ?)', [
      uuid(), demoId, 'Çocuk', '🚀', 1,
    ])
  }

  const contentCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM content')
  if ((contentCount?.count ?? 0) === 0) {
    for (const row of SEED_CONTENT) {
      dbRun(
        `INSERT INTO content (id, title, description, year, duration, rating, type, genres, poster, backdrop, video_url, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...row],
      )
    }
    for (const [id, title, order, items] of SEED_CATEGORIES) {
      dbRun('INSERT INTO categories (id, title, sort_order) VALUES (?, ?, ?)', [id, title, order])
      items.forEach((contentId, index) => {
        dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
          id, contentId, index,
        ])
      })
    }
  }
}

export function resetContent() {
  dbExec(
    "DELETE FROM watchlist; DELETE FROM category_items; DELETE FROM categories; DELETE FROM content; DELETE FROM site_settings WHERE key = 'category_order';",
  )
  for (const row of SEED_CONTENT) {
    dbRun(
      `INSERT INTO content (id, title, description, year, duration, rating, type, genres, poster, backdrop, video_url, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...row],
    )
  }
  for (const [id, title, order, items] of SEED_CATEGORIES) {
    dbRun('INSERT INTO categories (id, title, sort_order) VALUES (?, ?, ?)', [id, title, order])
    items.forEach((contentId, index) => {
      dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
        id, contentId, index,
      ])
    })
  }
  seedLandingData(true)
}

const DEFAULT_LANDING_SLIDER = [
  'aurora-dreams',
  'neon-pulse',
  'code-breakers',
  'ocean-whispers',
  'midnight-istanbul',
]

const DEFAULT_LANDING_SHOWCASES = [
  {
    id: 'landing-dizi',
    title: 'Dizi',
    icon: 'dizi',
    description: 'Sezon sezon sürükleyici hikayeler ve orijinal diziler.',
    items: ['code-breakers', 'neon-pulse', 'chef-table', 'anime-horizon'],
  },
  {
    id: 'landing-film',
    title: 'Film',
    icon: 'film',
    description: 'Ödüllü yapımlar, festival favorileri ve seçkin sinema.',
    items: ['aurora-dreams', 'midnight-istanbul', 'wind-road', 'ocean-whispers'],
  },
  {
    id: 'landing-belgesel',
    title: 'Belgesel',
    icon: 'belgesel',
    description: 'Gerçek hikayeler, derin keşifler ve doğa belgeselleri.',
    items: ['golden-era', 'wild-planet', 'chef-table'],
  },
  {
    id: 'landing-cocuk',
    title: 'Çocuk',
    icon: 'cocuk',
    description: 'Ailece izlenebilecek güvenli ve eğlenceli içerikler.',
    items: ['little-stars'],
  },
  {
    id: 'landing-dikey',
    title: 'Dikey Dizi',
    icon: 'dikey',
    description: 'Mobil öncelikli kısa bölümler — kaydır, izle, devam et.',
    items: ['kalp-satirlari'],
  },
] as const

export function ensureLandingShowcases() {
  for (const showcase of DEFAULT_LANDING_SHOWCASES) {
    const exists = dbGet<{ id: string }>('SELECT id FROM landing_showcases WHERE id = ?', [showcase.id])
    if (exists) continue

    const maxOrder = dbGet<{ max: number | null }>('SELECT MAX(sort_order) as max FROM landing_showcases')
    const order = (maxOrder?.max ?? -1) + 1

    dbRun(
      'INSERT INTO landing_showcases (id, title, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      [showcase.id, showcase.title, showcase.icon, showcase.description, order],
    )
    showcase.items.forEach((contentId, itemIndex) => {
      const contentExists = dbGet('SELECT id FROM content WHERE id = ?', [contentId])
      if (!contentExists) return
      dbRun(
        'INSERT INTO landing_showcase_items (showcase_id, content_id, sort_order) VALUES (?, ?, ?)',
        [showcase.id, contentId, itemIndex],
      )
    })
  }
}

/** @deprecated use ensureLandingShowcases */
export function ensureDikeyShowcase() {
  ensureLandingShowcases()
}

export function seedLandingData(force = false) {
  const existing = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM landing_showcases')
  if (!force && (existing?.count ?? 0) > 0) return

  dbRun('DELETE FROM landing_showcase_items')
  dbRun('DELETE FROM landing_showcases')
  dbRun('DELETE FROM landing_slider')

  DEFAULT_LANDING_SLIDER.forEach((contentId, index) => {
    dbRun('INSERT INTO landing_slider (content_id, sort_order) VALUES (?, ?)', [contentId, index])
  })

  DEFAULT_LANDING_SHOWCASES.forEach((showcase, index) => {
    dbRun(
      'INSERT INTO landing_showcases (id, title, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      [showcase.id, showcase.title, showcase.icon, showcase.description, index],
    )
    showcase.items.forEach((contentId, itemIndex) => {
      dbRun(
        'INSERT INTO landing_showcase_items (showcase_id, content_id, sort_order) VALUES (?, ?, ?)',
        [showcase.id, contentId, itemIndex],
      )
    })
  })
}

/** Eski seed id → güncel kayıt eşlemesi */
const LEGACY_SCHOOL_ID_MAP: Record<string, string> = {
  'istanbul-bilgi': 'istanbul-bilgi-universitesi',
  'kadir-has': 'kadir-has-universitesi',
  'mimar-sinan': 'mimar-sinan-sinema-tv',
  'yasar': 'yasar-universitesi',
  'anadolu-sinema': 'anadolu-sinema-tv',
}

export function ensureFilmSchools() {
  const now = new Date().toISOString()

  for (const [legacyId, nextId] of Object.entries(LEGACY_SCHOOL_ID_MAP)) {
    const legacy = dbGet<{ id: string }>('SELECT id FROM film_schools WHERE id = ?', [legacyId])
    const target = dbGet<{ id: string }>('SELECT id FROM film_schools WHERE id = ?', [nextId])
    if (legacy && !target) {
      dbRun('UPDATE film_schools SET id = ?, slug = ? WHERE id = ?', [nextId, nextId, legacyId])
      dbRun('UPDATE creators SET school_id = ? WHERE school_id = ?', [nextId, legacyId])
      dbRun('UPDATE content SET school_id = ? WHERE school_id = ?', [nextId, legacyId])
    }
  }

  for (const school of TURKEY_FILM_SCHOOLS) {
    const existing = dbGet<{ id: string }>('SELECT id FROM film_schools WHERE id = ? OR slug = ?', [
      school.id,
      school.slug,
    ])
    if (!existing) {
      dbRun(
        'INSERT INTO film_schools (id, name, slug, logo_url, website, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [school.id, school.name, school.slug, '', '', 'active', now],
      )
      continue
    }
    dbRun('UPDATE film_schools SET name = ?, slug = ?, status = ? WHERE id = ?', [
      school.name,
      school.slug,
      'active',
      existing.id,
    ])
  }

  upsertCategory('genc-sinema', 'Genç Sinema', 3)
}

const GENC_SINEMA_DEMO_FILMS = [
  {
    id: 'genc-sinema-demo-01',
    title: 'Son Vagon',
    description: 'Mezuniyet gecesi tren istasyonunda bekleyen iki arkadaşın, hayatlarının en uzun gecesine tanıklığı.',
    year: 2025,
    duration: '18 dk',
    rating: '13+',
    type: 'kisa-film',
    genres: ['Dram', 'Kısa Film'],
    poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&h=900&fit=crop',
    videoUrl: V.tears,
    schoolId: 'bahcesehir-sinema-tv',
    daysAgo: 1,
  },
  {
    id: 'genc-sinema-demo-02',
    title: 'Boş Oda',
    description: 'Tahliye edilen bir yurt odasında kalan eşyalar, bir öğrencinin geçmişini yeniden canlandırır.',
    year: 2025,
    duration: '14 dk',
    rating: '13+',
    type: 'kisa-film',
    genres: ['Dram', 'Gerilim'],
    poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=900&fit=crop',
    videoUrl: V.sintel,
    schoolId: 'istanbul-bilgi-universitesi',
    daysAgo: 3,
  },
  {
    id: 'genc-sinema-demo-03',
    title: 'Kum Saati',
    description: 'Final projesi için son gününe giren bir yönetmen adayının stres dolu 24 saati.',
    year: 2024,
    duration: '22 dk',
    rating: '13+',
    type: 'kisa-film',
    genres: ['Dram', 'Komedi'],
    poster: 'https://images.unsplash.com/photo-1535016120720-40c6464ebe02?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&h=900&fit=crop',
    videoUrl: V.bunny,
    schoolId: 'mimar-sinan-sinema-tv',
    daysAgo: 5,
  },
  {
    id: 'genc-sinema-demo-04',
    title: 'Gece Vardiyası',
    description: 'Gece yarısı açık kalan bir kütüphanede tesadüfen karşılaşan iki yabancının sessiz diyalogu.',
    year: 2025,
    duration: '12 dk',
    rating: 'Genel',
    type: 'kisa-film',
    genres: ['Romantik', 'Dram'],
    poster: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1516589176970-021cd9f9f2f5?w=1600&h=900&fit=crop',
    videoUrl: V.elephants,
    schoolId: 'ege-universitesi',
    daysAgo: 7,
  },
  {
    id: 'genc-sinema-demo-05',
    title: 'Sessiz Mektuplar',
    description: 'Annesinden kalan eski bir film makinesiyle geçmişe yolculuk yapan genç bir kadının hikâyesi.',
    year: 2024,
    duration: '16 dk',
    rating: '13+',
    type: 'kisa-film',
    genres: ['Dram', 'Aile'],
    poster: 'https://images.unsplash.com/photo-1594909128353-aa2d4ae0e8fb?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=900&fit=crop',
    videoUrl: V.subaru,
    schoolId: 'anadolu-sinema-tv',
    daysAgo: 9,
  },
  {
    id: 'genc-sinema-demo-06',
    title: 'Perde Arası',
    description: 'Üniversite tiyatrosunda prova arasında yaşanan komik ve dokunaklı anlar.',
    year: 2025,
    duration: '10 dk',
    rating: 'Genel',
    type: 'kisa-film',
    genres: ['Komedi', 'Kısa Film'],
    poster: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&h=900&fit=crop',
    videoUrl: V.fun,
    schoolId: 'akdeniz-universitesi',
    daysAgo: 11,
  },
  {
    id: 'genc-sinema-demo-07',
    title: 'İz Bırakan',
    description: 'Sokak fotoğrafçılığı dersi kapsamında çekilen belgesel: şehrin görünmeyen yüzleri.',
    year: 2024,
    duration: '20 dk',
    rating: 'Genel',
    type: 'belgesel',
    genres: ['Belgesel', 'Yerli'],
    poster: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1518173946687-a4c036bc2ee0?w=1600&h=900&fit=crop',
    videoUrl: V.joyrides,
    schoolId: 'cukurova-universitesi',
    daysAgo: 13,
  },
  {
    id: 'genc-sinema-demo-08',
    title: 'Karanlık Koridor',
    description: 'Eski bir sinema binasının bodrum katında geçen, gerilim dolu bir mezuniyet projesi.',
    year: 2025,
    duration: '15 dk',
    rating: '16+',
    type: 'kisa-film',
    genres: ['Gerilim', 'Korku'],
    poster: 'https://images.unsplash.com/photo-1509281373367-fa7cf25a27f8?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&h=900&fit=crop',
    videoUrl: V.blazes,
    schoolId: 'inonu-universitesi',
    daysAgo: 15,
  },
  {
    id: 'genc-sinema-demo-09',
    title: 'Bir Adım Öte',
    description: 'Dans bölümü ile sinema bölümünün ortak projesi: hareketin ve ışığın buluştuğu deneysel kısa film.',
    year: 2025,
    duration: '8 dk',
    rating: 'Genel',
    type: 'kisa-film',
    genres: ['Deneysel', 'Sanat'],
    poster: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=900&fit=crop',
    videoUrl: V.meltdowns,
    schoolId: 'baskent-film-tasarimi',
    daysAgo: 17,
  },
  {
    id: 'genc-sinema-demo-10',
    title: 'Son Kare',
    description: 'Mezuniyet töreninde gösterilecek son filmi montajlayan bir ekibin geride kalan son gecesi.',
    year: 2024,
    duration: '25 dk',
    rating: '13+',
    type: 'kisa-film',
    genres: ['Dram', 'Kısa Film'],
    poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&h=900&fit=crop',
    videoUrl: V.escapes,
    schoolId: 'isik-sinema-tv',
    daysAgo: 19,
  },
] as const

const GENC_SINEMA_DEMO_DIRECTORS = [
  'Elif Yılmaz',
  'Can Demir',
  'Zeynep Koç',
  'Arda Güneş',
  'Selin Kara',
  'Hakan Şanal',
  'Deniz Acar',
  'Aylin Er',
  'Burak Öztürk',
  'Cemre Aydın',
] as const

function demoStudentCredits(index: number) {
  const director = GENC_SINEMA_DEMO_DIRECTORS[index % GENC_SINEMA_DEMO_DIRECTORS.length]
  return serializeCredits({
    directors: [director],
    producers: [director],
    cast: [director],
    studio: '',
    audioLanguages: ['Türkçe'],
    subtitleLanguages: ['Türkçe', 'Türkçe [CC]'],
  })
}

export function ensureStudentCinemaDemoCredits() {
  GENC_SINEMA_DEMO_FILMS.forEach((film, index) => {
    const row = dbGet<{ credits_json?: string | null }>('SELECT credits_json FROM content WHERE id = ?', [film.id])
    if (!row) return
    const credits = parseCredits(row.credits_json)
    if ((credits.directors?.length ?? 0) > 0) return
    dbRun('UPDATE content SET credits_json = ? WHERE id = ?', [demoStudentCredits(index), film.id])
  })
}

export function ensureStudentCinemaDemoFilms() {
  const now = Date.now()

  for (const [index, film] of GENC_SINEMA_DEMO_FILMS.entries()) {
    const exists = dbGet('SELECT id FROM content WHERE id = ?', [film.id])
    if (exists) continue

    const school = dbGet('SELECT id FROM film_schools WHERE id = ?', [film.schoolId])
    if (!school) continue

    const publishedAt = new Date(now - film.daysAgo * 24 * 60 * 60 * 1000).toISOString()

    dbRun(
      `INSERT INTO content (
        id, title, description, year, duration, rating, type, genres, poster, backdrop,
        video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured,
        subtitles_json, credits_json, content_added_at, license_expires_at, published_at,
        creator_id, review_status, program, content_format, parent_content_id, school_id, school_review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        film.id,
        film.title,
        film.description,
        film.year,
        film.duration,
        film.rating,
        film.type,
        JSON.stringify(film.genres),
        film.poster,
        film.backdrop,
        film.videoUrl,
        'custom',
        film.videoUrl,
        'standard',
        0,
        null,
        0,
        '[]',
        demoStudentCredits(index),
        publishedAt,
        null,
        publishedAt,
        null,
        'published',
        'student_cinema',
        'main',
        null,
        film.schoolId,
        'approved',
      ],
    )
  }
}

const CREATOR_DEMO_PROFILES = [
  {
    id: 'creator-demo-01',
    userId: 'creator-user-01',
    email: 'mehmet@kuzeyfilm.demo',
    name: 'Mehmet Arslan',
    studioName: 'Kuzey Film Atölyesi',
    bio: 'Bağımsız kısa ve uzun metraj yapımlar.',
    filmCount: 2,
  },
  {
    id: 'creator-demo-02',
    userId: 'creator-user-02',
    email: 'ayse@perdearkasi.demo',
    name: 'Ayşe Demir',
    studioName: 'Perde Arkası Prodüksiyon',
    bio: 'Belgesel ve deneysel sinema.',
    filmCount: 4,
  },
  {
    id: 'creator-demo-03',
    userId: 'creator-user-03',
    email: 'can@anadoluisk.demo',
    name: 'Can Yılmaz',
    studioName: 'Anadolu Işık Yapım',
    bio: 'Yerel hikâyeler, yerel sesler.',
    filmCount: 3,
  },
  {
    id: 'creator-demo-04',
    userId: 'creator-user-04',
    email: 'elif@istanbulkisa.demo',
    name: 'Elif Şahin',
    studioName: 'İstanbul Kısa Film',
    bio: 'Festival odaklı kısa filmler.',
    filmCount: 5,
  },
  {
    id: 'creator-demo-05',
    userId: 'creator-user-05',
    email: 'burak@bagimsizsinema.demo',
    name: 'Burak Koç',
    studioName: 'Bağımsız Sinema Kolektifi',
    bio: 'Kolektif yapım modeli ile çalışan stüdyo.',
    filmCount: 6,
  },
] as const

const CREATOR_DEMO_TITLES = [
  'Sessiz Mahalle',
  'Son Perde',
  'Kuzey Rüzgarı',
  'Gece Vardiyası',
  'Cam Kenarı',
  'Boş Sahne',
  'Deniz Feneri',
  'Arka Sokak',
  'İki Şehir',
  'Kırık Lens',
  'Sabah Işığı',
  'Uzak Hat',
  'Küçük Oda',
  'Yağmur Sonrası',
  'Son Vagon Notu',
  'Perde Açılıyor',
  'Gölge Oyunu',
  'Merdiven',
  'Bekleyen',
  'Son Kare',
] as const

const CREATOR_DEMO_POSTERS = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1509281373367-fa7cf25a27f8?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1535016120720-40c6464ebe02?w=400&h=600&fit=crop',
] as const

const CREATOR_DEMO_VIDEOS = [V.tears, V.sintel, V.elephants, V.bunny, V.escapes] as const

function creatorDemoCredits(director: string, studio: string) {
  return serializeCredits({
    directors: [director],
    producers: [director],
    cast: [director],
    studio,
    audioLanguages: ['Türkçe'],
    subtitleLanguages: ['Türkçe'],
  })
}

function creatorDemoReviewState(index: number): {
  reviewStatus: 'pending' | 'published' | 'rejected'
  publishedAt: string | null
  licenseExpiresAt: string | null
} {
  const now = Date.now()
  const mod = index % 6
  if (mod === 0) {
    return {
      reviewStatus: 'pending',
      publishedAt: null,
      licenseExpiresAt: new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }
  if (mod === 1) {
    return {
      reviewStatus: 'published',
      publishedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      licenseExpiresAt: new Date(now + 180 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }
  if (mod === 2) {
    return {
      reviewStatus: 'published',
      publishedAt: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
      licenseExpiresAt: null,
    }
  }
  if (mod === 3) {
    return {
      reviewStatus: 'rejected',
      publishedAt: null,
      licenseExpiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }
  if (mod === 4) {
    return {
      reviewStatus: 'published',
      publishedAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      licenseExpiresAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }
  return {
    reviewStatus: 'published',
    publishedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    licenseExpiresAt: null,
  }
}

export function ensureCreatorDemoSeed() {
  if (!allowDemoAccountSeed()) return
  const now = new Date().toISOString()
  const passwordHash = bcrypt.hashSync('creator123', 10)
  let titleIndex = 0

  for (const profile of CREATOR_DEMO_PROFILES) {
    const userExists = dbGet('SELECT id FROM users WHERE id = ? OR email = ?', [profile.userId, profile.email])
    if (!userExists) {
      dbRun(
        'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [profile.userId, profile.name, profile.email, passwordHash, 'creator', now],
      )
    }

    const creatorExists = dbGet('SELECT id FROM creators WHERE id = ?', [profile.id])
    if (!creatorExists) {
      dbRun(
        'INSERT INTO creators (id, user_id, studio_name, bio, status, legal_accepted_at, created_at, program) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [profile.id, profile.userId, profile.studioName, profile.bio, 'approved', now, now, 'standard'],
      )
    }

    for (let filmIndex = 0; filmIndex < profile.filmCount; filmIndex += 1) {
      const globalIndex = titleIndex
      const contentId = `creator-film-${String(globalIndex + 1).padStart(2, '0')}`
      titleIndex += 1

      if (dbGet('SELECT id FROM content WHERE id = ?', [contentId])) continue

      const review = creatorDemoReviewState(globalIndex)
      const title = CREATOR_DEMO_TITLES[globalIndex]
      const poster = CREATOR_DEMO_POSTERS[globalIndex % CREATOR_DEMO_POSTERS.length]
      const videoUrl = CREATOR_DEMO_VIDEOS[globalIndex % CREATOR_DEMO_VIDEOS.length]

      dbRun(
        `INSERT INTO content (
          id, title, description, year, duration, rating, type, genres, poster, backdrop,
          video_url, source_video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured,
          subtitles_json, credits_json, content_added_at, license_expires_at, published_at,
          creator_id, review_status, program, content_format, parent_content_id, school_id, school_review_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contentId,
          title,
          `${profile.studioName} yapımı bağımsız film — admin incelemesi için demo kayıt.`,
          2024 + (globalIndex % 2),
          globalIndex % 3 === 0 ? '22 dk' : '1s 18dk',
          globalIndex % 2 === 0 ? '13+' : '16+',
          globalIndex % 4 === 0 ? 'kisa-film' : 'film',
          JSON.stringify(globalIndex % 2 === 0 ? ['Dram', 'Yerli'] : ['Belgesel', 'Dram']),
          poster,
          poster.replace('w=400&h=600', 'w=1600&h=900'),
          videoUrl,
          videoUrl,
          'custom',
          videoUrl,
          'standard',
          0,
          null,
          0,
          '[]',
          creatorDemoCredits(profile.name, profile.studioName),
          now,
          review.licenseExpiresAt,
          review.publishedAt,
          profile.id,
          review.reviewStatus,
          'standard',
          'main',
          null,
          null,
          'none',
        ],
      )
    }
  }
}
