import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from './db.js'

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

const VIDEO_POOL = Object.values(V)

const POSTERS = [
  'photo-1536440136628-849c177e76a1',
  'photo-1489599849927-2ee91cede3ba',
  'photo-1478720568477-152d9b164e26',
  'photo-1524231757912-21f4fe3a7200',
  'photo-1509281373367-fa7cf25a27f8',
  'photo-1448375240586-882707db888b',
  'photo-1535016120720-40c6464ebe02',
  'photo-1559827260-dc66d52bef19',
  'photo-1611162617474-5b21e939e113',
  'photo-1550751827-4bd374c3f58b',
  'photo-1485846234645-a62644f84728',
  'photo-1517604931442-7e0c8ed2963c',
  'photo-1594909128353-aa2d4ae0e8fb',
  'photo-1506905925346-21bda4d32df4',
  'photo-1574267432553-4b4628081c31',
  'photo-1451187580459-43490279c0fa',
  'photo-1446776811953-b23d57bd21aa',
  'photo-1419242902214-272b4f66ee7a',
  'photo-1504674900247-0877df9cc836',
  'photo-1414235077428-338989a2e8c0',
  'photo-1501281668745-f7f57925c3b4',
  'photo-1470229722913-7c0e2dbbafd3',
  'photo-1441974231531-c6227db76b6e',
  'photo-1518173946687-a4c036bc2ee0',
  'photo-1578632767115-351597cf2477',
  'photo-1612036782180-6f0b06ea7512',
  'photo-1516589176970-021cd9f9f2f5',
  'photo-1524504388940-b1c1722653e1',
  'photo-1626814020259-6a3f69abff37',
  'photo-1594908129503-9fa6f2d06d5a',
  'photo-1574269909862-e8daeb1d5a7c',
  'photo-1485846234645-a62644f84728',
  'photo-1440409856334-aa0276a798bf',
  'photo-1518676590699-075c784356cc',
  'photo-1534802046520-4faac9863c63',
  'photo-1598899134739-24aac119118d',
  'photo-1585647340883-22d66d09a0ae',
  'photo-1493225457124-a3eb161ffa5f',
  'photo-1506157782111-bc8984c8cc2a',
  'photo-1514525253161-7a46d19cd819',
]

const VERTICAL_POSTERS = [
  'photo-1516589176970-021cd9f9f2f5',
  'photo-1524504388940-b1c1722653e1',
  'photo-1494790108377-be9c29b29330',
  'photo-1529626455594-4ff0802cfb7e',
  'photo-1507003211169-0a1dd7228f2d',
]

const FILM_TITLES = [
  'Son Durak', 'Karanlık Şehir', 'Yıldızların Ötesi', 'Sessiz Tanık', 'Kırık Ayna',
  'Sonbahar Rüzgarı', 'Gölge Avı', 'Kayıp Zaman', 'İki Yüz', 'Sınır Tanımayan',
  'Gece Yolculuğu', 'Buz Kırığı', 'Ateş Hattı', 'Uçurum', 'Son Nefes',
  'Kuzey Işıkları', 'Gizli Kapı', 'Kırık Sözler', 'Deniz Feneri', 'Altın Saat',
]

const DIZI_TITLES = [
  'Şehir Işıkları', 'Kod Adı: Gece', 'Karanlık Oda', 'Sınır Şehri', 'İkinci Şans',
  'Gizli Dosya', 'Kırılma Noktası', 'Son Şahit', 'Karanlık Miras', 'Yeni Dünya',
  'Kırmızı Hat', 'Sisli Sokaklar', 'Son Kapı', 'Gölge Ekibi', 'Yıldız Şehri',
  'Kırık Krallık', 'Gece Nöbeti', 'Saklı Gerçek', 'Kuzey Hattı', 'Son Sezon',
]

const BELGESEL_TITLES = [
  'Vahşi Doğa', 'Okyanus Derinliği', 'Dağların Sesi', 'Antik Uygarlıklar', 'Gökyüzü Kuşları',
  'Kutup Macerası', 'Ormanın Kalbi', 'Denizaltı Dünyası', 'Çöl Rüzgarı', 'Volkanlar',
  'Buzullar', 'Yağmur Ormanı', 'Safari', 'Balinalar', 'Köpekbalıkları',
  'Arı Kovanı', 'Kelebek Vadisi', 'Kurt Sürüsü', 'Kartal Yuvası', 'Nehir Yolculuğu',
]

const KISA_FILM_TITLES = [
  'Bir An', 'Son Bakış', 'Kısa Yol', 'Sessiz Adım', 'Işık Oyunu',
  'Küçük Dünya', 'Dönüş', 'Pencere', 'Yağmur Sonrası', 'Gece Yarısı',
  'İlk Adım', 'Son Mesaj', 'Boş Oda', 'Kırık Saat', 'Uzak Ses',
  'Kısa Devre', 'Son Durakta', 'Gölge Dansı', 'Minik Kahraman', 'Sis',
]

const COCUK_TITLES = [
  'Minik Kaşif', 'Uzay Macerası', 'Renkli Dünya', 'Sevimli Dostlar', 'Hayal Ormanı',
  'Pırıl Pırıl', 'Gökkuşağı Yolu', 'Cesur Kedi', 'Yıldız Peşinde', 'Oyun Bahçesi',
  'Mutlu Aile', 'Sihirli Kitap', 'Bulutların Üstü', 'Denizaltı Dostu', 'Küçük Şef',
  'Orman Okulu', 'Gülen Güneş', 'Pamuk Şeker', 'Uçan Balon', 'Neşeli Çiftlik',
]

const DIKEY_TITLES = [
  'Kalp Satırları', 'Mesaj Kutusu', 'Kampüs Hikayesi', 'Gece Sohbeti', 'Son Mesaj',
  'Yanlış Numara', 'İlk Bakış', 'Gizli Aşk', 'Son Bölüm', 'Yeni Başlangıç',
  'Kısa Hikaye', 'Duygu Dalgası', 'Sessiz İtiraf', 'Gece Yarısı', 'Sabah Işığı',
  'Son Şans', 'Kırık Kalp', 'Yeni Mesaj', 'Gizli Sır', 'Final',
]

const TARGET_PER_TYPE = 20

function posterUrl(photoId: string, vertical = false) {
  const size = vertical ? 'w=400&h=711' : 'w=400&h=600'
  return `https://images.unsplash.com/${photoId}?${size}&fit=crop`
}

function backdropUrl(photoId: string) {
  return `https://images.unsplash.com/${photoId}?w=1600&h=900&fit=crop`
}

function pickVideo(index: number) {
  return VIDEO_POOL[index % VIDEO_POOL.length]
}

function pickPoster(index: number, vertical = false) {
  const pool = vertical ? VERTICAL_POSTERS : POSTERS
  return pool[index % pool.length]
}

interface DemoItem {
  id: string
  title: string
  type: string
  genres: string[]
  rating: string
  duration: string
  vertical?: boolean
}

export function buildDemoItems(): DemoItem[] {
  const items: DemoItem[] = []

  FILM_TITLES.forEach((title, index) => {
    items.push({
      id: `demo-film-${index + 1}`,
      title,
      type: 'film',
      genres: ['Dram', 'Film'],
      rating: index % 3 === 0 ? '16+' : '13+',
      duration: `${1 + (index % 2)}s ${20 + (index % 40)}dk`,
    })
  })

  DIZI_TITLES.forEach((title, index) => {
    items.push({
      id: `demo-dizi-${index + 1}`,
      title,
      type: 'dizi',
      genres: ['Dizi', 'Dram'],
      rating: '13+',
      duration: `${6 + (index % 8)} bölüm`,
    })
  })

  BELGESEL_TITLES.forEach((title, index) => {
    items.push({
      id: `demo-belgesel-${index + 1}`,
      title,
      type: 'belgesel',
      genres: ['Belgesel', 'Doğa'],
      rating: 'Genel',
      duration: `${45 + (index % 30)} dk`,
    })
  })

  KISA_FILM_TITLES.forEach((title, index) => {
    items.push({
      id: `demo-kisa-film-${index + 1}`,
      title,
      type: 'kisa-film',
      genres: ['Kısa Film', 'Dram'],
      rating: index % 4 === 0 ? 'Genel' : '13+',
      duration: `${8 + (index % 15)} dk`,
    })
  })

  COCUK_TITLES.forEach((title, index) => {
    items.push({
      id: `demo-cocuk-${index + 1}`,
      title,
      type: 'film',
      genres: ['Aile', 'Animasyon'],
      rating: 'Genel',
      duration: `${30 + (index % 40)} dk`,
    })
  })

  DIKEY_TITLES.forEach((title, index) => {
    items.push({
      id: index === 0 ? 'kalp-satirlari' : `demo-dikey-${index + 1}`,
      title,
      type: 'dizi',
      genres: ['Romantik', 'Dikey', 'Dram'],
      rating: '13+',
      duration: `${20 + (index % 30)} bölüm`,
      vertical: true,
    })
  })

  return items
}

function upsertDemoContent(item: DemoItem, index: number) {
  const exists = dbGet('SELECT id FROM content WHERE id = ?', [item.id])
  const photo = pickPoster(index, item.vertical)
  const poster = posterUrl(photo, item.vertical)
  const backdrop = backdropUrl(photo)
  const video = pickVideo(index)
  const genresJson = JSON.stringify(item.genres)
  const newUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

  if (exists) return

  dbRun(
    `INSERT INTO content (id, title, description, year, duration, rating, type, genres, poster, backdrop, video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom', ?, ?, 1, ?, 0)`,
    [
      item.id,
      item.title,
      `${item.title} — Sineoda demo kataloğu.`,
      2023 + (index % 3),
      item.duration,
      item.rating,
      item.type,
      genresJson,
      poster,
      backdrop,
      video,
      video,
      item.vertical ? 'vertical' : 'standard',
      newUntil,
    ],
  )
}

function getIdsByType(type: string, limit = TARGET_PER_TYPE) {
  return dbAll<{ id: string }>(
    'SELECT id FROM content WHERE type = ? ORDER BY title LIMIT ?',
    [type, limit],
  ).map((row) => row.id)
}

function getKidsIds(limit = TARGET_PER_TYPE) {
  return dbAll<{ id: string }>(
    `SELECT id FROM content WHERE rating = 'Genel' OR genres LIKE '%Aile%' OR genres LIKE '%Animasyon%' ORDER BY title LIMIT ?`,
    [limit],
  ).map((row) => row.id)
}

function getVerticalIds(limit = TARGET_PER_TYPE) {
  return dbAll<{ id: string }>(
    `SELECT id FROM content WHERE video_format = 'vertical' ORDER BY title LIMIT ?`,
    [limit],
  ).map((row) => row.id)
}

function replaceShowcaseItems(showcaseId: string, title: string, icon: string, description: string, sortOrder: number, itemIds: string[]) {
  const exists = dbGet('SELECT id FROM landing_showcases WHERE id = ?', [showcaseId])
  if (exists) {
    dbRun('UPDATE landing_showcases SET title = ?, icon = ?, description = ?, sort_order = ? WHERE id = ?', [
      title, icon, description, sortOrder, showcaseId,
    ])
  } else {
    dbRun(
      'INSERT INTO landing_showcases (id, title, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      [showcaseId, title, icon, description, sortOrder],
    )
  }

  dbRun('DELETE FROM landing_showcase_items WHERE showcase_id = ?', [showcaseId])
  itemIds.forEach((contentId, index) => {
    const contentExists = dbGet('SELECT id FROM content WHERE id = ?', [contentId])
    if (!contentExists) return
    dbRun(
      'INSERT INTO landing_showcase_items (showcase_id, content_id, sort_order) VALUES (?, ?, ?)',
      [showcaseId, contentId, index],
    )
  })
}

function replaceCategoryItems(categoryId: string, title: string, sortOrder: number, itemIds: string[]) {
  const exists = dbGet('SELECT id FROM categories WHERE id = ?', [categoryId])
  if (exists) {
    dbRun('UPDATE categories SET title = ?, sort_order = ? WHERE id = ?', [title, sortOrder, categoryId])
  } else {
    dbRun('INSERT INTO categories (id, title, sort_order) VALUES (?, ?, ?)', [categoryId, title, sortOrder])
  }

  dbRun('DELETE FROM category_items WHERE category_id = ?', [categoryId])
  itemIds.forEach((contentId, index) => {
    const contentExists = dbGet('SELECT id FROM content WHERE id = ?', [contentId])
    if (!contentExists) return
    dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
      categoryId, contentId, index,
    ])
  })
}

function syncLandingShowcases() {
  const dizi = getIdsByType('dizi')
  const film = getIdsByType('film')
  const belgesel = getIdsByType('belgesel')
  const kisa = getIdsByType('kisa-film')
  const cocuk = getKidsIds()
  const dikey = getVerticalIds()

  replaceShowcaseItems(
    'landing-dizi',
    'Dizi',
    'dizi',
    'Sezon sezon sürükleyici hikayeler ve orijinal diziler.',
    0,
    dizi.slice(0, TARGET_PER_TYPE),
  )
  replaceShowcaseItems(
    'landing-film',
    'Film',
    'film',
    'Ödüllü yapımlar, festival favorileri ve seçkin sinema.',
    1,
    film.slice(0, TARGET_PER_TYPE),
  )
  replaceShowcaseItems(
    'landing-belgesel',
    'Belgesel',
    'belgesel',
    'Gerçek hikayeler, derin keşifler ve doğa belgeselleri.',
    2,
    belgesel.slice(0, TARGET_PER_TYPE),
  )
  replaceShowcaseItems(
    'landing-cocuk',
    'Çocuk',
    'cocuk',
    'Ailece izlenebilecek güvenli ve eğlenceli içerikler.',
    3,
    cocuk.slice(0, TARGET_PER_TYPE),
  )
  replaceShowcaseItems(
    'landing-dikey',
    'Dikey Dizi',
    'dikey',
    'Mobil öncelikli kısa bölümler — kaydır, izle, devam et.',
    4,
    dikey.slice(0, TARGET_PER_TYPE),
  )
  replaceShowcaseItems(
    'landing-kisa-film',
    'Kısa Film',
    'film',
    'Festival ödüllü kısa metraj yapımlar.',
    5,
    kisa.slice(0, TARGET_PER_TYPE),
  )
}

function syncBrowseCategories() {
  const allIds = dbAll<{ id: string }>('SELECT id FROM content ORDER BY title').map((r) => r.id)
  const trending = allIds.slice(0, TARGET_PER_TYPE)
  const dizi = getIdsByType('dizi')
  const film = getIdsByType('film')
  const belgesel = getIdsByType('belgesel')
  const kisa = getIdsByType('kisa-film')
  const dikey = getVerticalIds()

  replaceCategoryItems('trending', 'Bu Hafta Trend', 0, trending)
  replaceCategoryItems('series', 'Popüler Diziler', 2, dizi.slice(0, TARGET_PER_TYPE))
  replaceCategoryItems('documentary', 'Belgeseller', 3, belgesel.slice(0, TARGET_PER_TYPE))
  replaceCategoryItems('vertical-series', 'Dikey Diziler', 8, dikey.slice(0, TARGET_PER_TYPE))
  replaceCategoryItems('filmler-row', 'Filmler', 9, film.slice(0, TARGET_PER_TYPE))
  replaceCategoryItems('kisa-filmler-row', 'Kısa Filmler', 10, kisa.slice(0, TARGET_PER_TYPE))
  replaceCategoryItems('family', 'Aile İçin', 5, getKidsIds().slice(0, TARGET_PER_TYPE))
}

export function ensureDemoContentById(contentId: string): boolean {
  const items = buildDemoItems()
  const index = items.findIndex((item) => item.id === contentId)
  if (index === -1) return false
  const exists = dbGet('SELECT id FROM content WHERE id = ?', [contentId])
  if (exists) return true
  upsertDemoContent(items[index], index)
  return true
}

export function ensureDemoCatalog() {
  const items = buildDemoItems()
  items.forEach((item, index) => upsertDemoContent(item, index))
  syncLandingShowcases()
  syncBrowseCategories()
}
