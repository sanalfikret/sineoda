import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { dbAll, dbExec, dbGet, dbRun } from './db.js'

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
  ['midnight-istanbul', 'Gece Yarısı İstanbul', 'Bir müzisyenin şehirde kendini bulma hikayesi.', 2024, '1s 58dk', '16+', 'film', '["Dram","Müzikal"]', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&h=900&fit=crop', V.sintel, 0],
  ['silent-forest', 'Sessiz Orman', 'Kaybolan bir köyün sırrını çözen belgesel ekibi.', 2023, '1s 42dk', '18+', 'film', '["Gerilim","Korku","Gizem"]', 'https://images.unsplash.com/photo-1509281373367-fa7cf25a27f8?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&h=900&fit=crop', V.elephants, 0],
  ['ocean-whispers', 'Okyanus Fısıltıları', 'Derin denizlerde keşfedilen antik medeniyet.', 2025, '2s 5dk', '13+', 'film', '["Macera","Fantastik"]', 'https://images.unsplash.com/photo-1535016120720-40c6464ebe02?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&h=900&fit=crop', V.escapes, 0],
  ['code-breakers', 'Kod Kırıcılar', 'Hacker ekibi küresel siber saldırıyı durdurmaya çalışır.', 2024, '8 bölüm', '13+', 'dizi', '["Aksiyon","Dizi"]', 'https://images.unsplash.com/photo-1611162617474-5b21e939e113?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=900&fit=crop', V.blazes, 0],
  ['golden-era', 'Altın Çağ', '1950ler sinemasının perde arkası.', 2022, '1s 28dk', 'Genel', 'belgesel', '["Belgesel","Tarih"]', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600&h=900&fit=crop', V.bunny, 0],
  ['wind-road', 'Rüzgar Yolu', 'Anadoluda geçen sıcak bir aile draması.', 2023, '1s 52dk', '13+', 'film', '["Dram","Yerli"]', 'https://images.unsplash.com/photo-1594909128353-aa2d4ae0e8fb?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=900&fit=crop', V.subaru, 0],
  ['neon-pulse', 'Neon Nabız', 'Geleceğin şehrinde bir dedektifin vakası.', 2025, '10 bölüm', '16+', 'dizi', '["Noir","Dizi"]', 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=900&fit=crop', V.meltdowns, 0],
  ['little-stars', 'Küçük Yıldızlar', 'Genç bir astronot adayının hikayesi.', 2024, '1s 36dk', 'Genel', 'film', '["Aile","Komedi","Macera"]', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1419242902214-272b4f66ee7a?w=1600&h=900&fit=crop', V.fun, 0],
  ['chef-table', 'Şef Masası', 'Dünyadan şeflerin mutfak felsefeleri.', 2023, '6 bölüm', 'Genel', 'dizi', '["Belgesel","Komedi","Yemek"]', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop', V.joyrides, 0],
  ['stage-lights', 'Sahne Işıkları', 'Türkiye\'nin en sevilen komedyenlerinden unutulmaz bir stand-up gecesi.', 2024, '1s 12dk', '16+', 'film', '["Stand-up","Komedi"]', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&h=900&fit=crop', V.fun, 0],
  ['wild-planet', 'Vahşi Gezegen', 'Dünyanın en uzak köşelerinde doğanın sırları.', 2023, '1s 35dk', 'Genel', 'belgesel', '["Belgesel","Doğa"]', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1518173946687-a4c036bc2ee0?w=1600&h=900&fit=crop', V.elephants, 0],
  ['anime-horizon', 'Anime Ufku', 'Geleceğin savaşçılarının epik macerası.', 2025, '12 bölüm', '13+', 'dizi', '["Anime","Aksiyon","Bilim Kurgu"]', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1612036782180-6f0b06ea7512?w=1600&h=900&fit=crop', V.sintel, 0],
] as const

const EDITORIAL_CATEGORIES = [
  ['trending', 'Bu Hafta Trend', 0, ['aurora-dreams', 'neon-pulse', 'code-breakers', 'ocean-whispers']],
  ['new', 'Yeni Eklenenler', 1, ['aurora-dreams', 'ocean-whispers', 'neon-pulse', 'little-stars', 'kalp-satirlari']],
  ['series', 'Popüler Diziler', 2, ['code-breakers', 'neon-pulse', 'chef-table', 'kalp-satirlari', 'anime-horizon']],
  ['documentary', 'Belgeseller', 3, ['golden-era', 'chef-table', 'wild-planet']],
  ['standup', 'Stand-up', 4, ['stage-lights']],
  ['family', 'Aile İçin', 5, ['little-stars']],
  ['animation', 'Animasyon', 6, ['little-stars']],
  ['anime', 'Anime', 7, ['anime-horizon']],
  ['vertical-series', 'Dikey Diziler', 8, ['kalp-satirlari']],
  ['local', 'Yerli Yapımlar', 9, ['wind-road', 'midnight-istanbul', 'golden-era', 'stage-lights']],
  ['crime', 'Suç ve Gizem', 10, ['neon-pulse', 'silent-forest', 'code-breakers']],
  ['romance', 'Romantik', 11, ['kalp-satirlari', 'midnight-istanbul', 'wind-road']],
  ['scifi-fantasy', 'Bilim Kurgu ve Fantastik', 12, ['aurora-dreams', 'ocean-whispers', 'anime-horizon']],
  ['comedy-specials', 'Komedi Özel', 13, ['stage-lights', 'little-stars', 'chef-table']],
] as const

const GENRE_CATEGORIES = [
  ['genre-dram', 'Dram', 20, ['aurora-dreams', 'midnight-istanbul', 'wind-road', 'kalp-satirlari']],
  ['genre-komedi', 'Komedi', 21, ['little-stars', 'chef-table', 'stage-lights']],
  ['genre-romantik', 'Romantik', 22, ['kalp-satirlari', 'midnight-istanbul', 'wind-road']],
  ['genre-gerilim', 'Gerilim', 23, ['silent-forest', 'neon-pulse']],
  ['genre-korku', 'Korku', 24, ['silent-forest']],
  ['genre-aksiyon', 'Aksiyon', 25, ['code-breakers', 'ocean-whispers', 'anime-horizon']],
  ['genre-belgesel', 'Belgesel', 26, ['golden-era', 'chef-table', 'wild-planet']],
  ['genre-stand-up', 'Stand-up', 27, ['stage-lights']],
  ['genre-bilim-kurgu', 'Bilim Kurgu', 28, ['aurora-dreams', 'anime-horizon']],
  ['genre-fantastik', 'Fantastik', 29, ['ocean-whispers']],
  ['genre-macera', 'Macera', 30, ['ocean-whispers', 'little-stars']],
  ['genre-suc', 'Suç', 31, ['neon-pulse', 'code-breakers']],
  ['genre-gizem', 'Gizem', 32, ['silent-forest', 'neon-pulse']],
  ['genre-aile', 'Aile', 33, ['little-stars']],
  ['genre-animasyon', 'Animasyon', 34, ['little-stars']],
  ['genre-anime', 'Anime', 35, ['anime-horizon']],
  ['genre-muzikal', 'Müzikal', 36, ['midnight-istanbul']],
  ['genre-reality', 'Reality', 37, ['chef-table']],
  ['genre-yerli', 'Yerli', 38, ['wind-road', 'midnight-istanbul', 'stage-lights']],
  ['genre-spor', 'Spor', 39, []],
] as const

const SEED_CATEGORIES = [
  ...EDITORIAL_CATEGORIES,
  ...GENRE_CATEGORIES,
] as const

export function ensureGenreCategories() {
  ensureCatalogCategories()
}

function upsertCategory(id: string, title: string, sortOrder: number) {
  const exists = dbGet('SELECT id FROM categories WHERE id = ?', [id])
  if (exists) {
    dbRun('UPDATE categories SET title = ?, sort_order = ? WHERE id = ?', [title, sortOrder, id])
  } else {
    dbRun('INSERT INTO categories (id, title, sort_order) VALUES (?, ?, ?)', [id, title, sortOrder])
  }
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
    ['stage-lights', 'Sahne Işıkları', 'Türkiye\'nin en sevilen komedyenlerinden unutulmaz bir stand-up gecesi.', 2024, '1s 12dk', '16+', 'film', '["Stand-up","Komedi"]', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=600&fit=crop', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&h=900&fit=crop', V.fun, 0],
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
  } else {
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
  for (const id of newIds) {
    const exists = dbGet('SELECT id FROM content WHERE id = ?', [id])
    if (!exists) continue
    dbRun('UPDATE content SET is_new = 1, new_until = ? WHERE id = ?', [
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      id,
    ])
  }

  ensureSeedCredits()
  ensureContentTypes()
}

function ensureContentTypes() {
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
    producers: ['Sineoda Originals'],
    cast: ['Deniz Aksoy', 'Merve Çelik', 'Burak Kaya'],
    studio: 'Sineoda Studios',
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
    studio: 'Sineoda Originals',
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

export function seedDatabase() {
  const userCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM users')
  if ((userCount?.count ?? 0) === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10)
    const adminId = uuid()
    dbRun(
      'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, 'Sineoda Admin', 'admin@sineoda.com', adminHash, 'admin', new Date().toISOString()],
    )

    const demoHash = bcrypt.hashSync('demo1234', 10)
    const demoId = uuid()
    dbRun(
      'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [demoId, 'Demo Kullanıcı', 'demo@sineoda.com', demoHash, 'user', new Date().toISOString()],
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
  dbExec('DELETE FROM watchlist; DELETE FROM category_items; DELETE FROM categories; DELETE FROM content;')
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
    title: 'Dikey',
    icon: 'dikey',
    description: 'Mobil öncelikli kısa bölümler — kaydır, izle, devam et.',
    items: ['kalp-satirlari'],
  },
] as const

export function ensureDikeyShowcase() {
  const exists = dbGet<{ id: string }>('SELECT id FROM landing_showcases WHERE id = ?', ['landing-dikey'])
  if (exists) return

  const maxOrder = dbGet<{ max: number | null }>('SELECT MAX(sort_order) as max FROM landing_showcases')
  const order = (maxOrder?.max ?? -1) + 1

  dbRun(
    'INSERT INTO landing_showcases (id, title, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)',
    ['landing-dikey', 'Dikey', 'dikey', 'Mobil öncelikli kısa bölümler — kaydır, izle, devam et.', order],
  )
  dbRun(
    'INSERT INTO landing_showcase_items (showcase_id, content_id, sort_order) VALUES (?, ?, ?)',
    ['landing-dikey', 'kalp-satirlari', 0],
  )
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
