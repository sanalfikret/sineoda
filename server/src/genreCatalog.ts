import { BROWSE_GENRES } from '../../shared/catalog/genres.js'
import { dbGet, dbRun } from './db.js'
import { preserveExistingContent } from './services/seedPolicy.js'
import { buildGenreToEditorialIdMap } from './editorialCategories.js'

const FEATURED_BROWSE_GENRES = BROWSE_GENRES

const POSTERS = [
  'photo-1536440136628-849c177e76a1', 'photo-1489599849927-2ee91cede3ba', 'photo-1478720568477-152d9b164e26',
  'photo-1524231757912-21f4fe3a7200', 'photo-1509281373367-fa7cf25a27f8', 'photo-1448375240586-882707db888b',
  'photo-1535016120720-40c6464ebe02', 'photo-1559827260-dc66d52bef19', 'photo-1611162617474-5b21e939e113',
  'photo-1550751827-4bd374c3f58b', 'photo-1485846234645-a62644f84728', 'photo-1517604931442-7e0c8ed2963c',
  'photo-1594909128353-aa2d4ae0e8fb', 'photo-1506905925346-21bda4d32df4', 'photo-1574267432553-4b4628081c31',
  'photo-1451187580459-43490279c0fa', 'photo-1446776811953-b23d57bd21aa', 'photo-1419242902214-272b4f66ee7a',
  'photo-1504674900247-0877df9cc836', 'photo-1414235077428-338989a2e8c0', 'photo-1501281668745-f7f57925c3b4',
  'photo-1470229722913-7c0e2dbbafd3', 'photo-1441974231531-c6227db76b6e', 'photo-1518173946687-a4c036bc2ee0',
  'photo-1578632767115-351597cf2477', 'photo-1612036782180-6f0b06ea7512', 'photo-1516589176970-021cd9f9f2f5',
  'photo-1524504388940-b1c1722653e1', 'photo-1626814020259-6a3f69abff37', 'photo-1594908129503-9fa6f2d06d5a',
  'photo-1574269909862-e8daeb1d5a7c', 'photo-1440409856334-aa0276a798bf', 'photo-1518676590699-075c784356cc',
  'photo-1534802046520-4faac9863c63', 'photo-1598899134739-24aac119118d', 'photo-1585647340883-22d66d09a0ae',
  'photo-1493225457124-a3eb161ffa5f', 'photo-1506157782111-bc8984c8cc2a', 'photo-1514525253161-7a46d19cd819',
  'photo-1529626455594-4ff0802cfb7e', 'photo-1507003211169-0a1dd7228f2d', 'photo-1534528741775-53994a69daeb',
  'photo-1506794778202-cad84cf45f1d', 'photo-1438761681033-6461ffad8d80', 'photo-1469474968028-56623f02e42e',
  'photo-1519681393784-d120267933ba', 'photo-1503264116251-35a269479413', 'photo-1497032628192-86f141bcd16a',
  'photo-1511379932383-f345fab5568d', 'photo-1456513080510-7bf3a84b82f8',
]

const VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
]

const GENRE_TITLES: Record<(typeof FEATURED_BROWSE_GENRES)[number], string[]> = {
  Aksiyon: ['Hızlı Takip', 'Son Mermi', 'Kaçış Planı', 'Tehlike Hattı', 'Çarpışma', 'Gece Operasyonu', 'Ölümcül Yarış', 'Gölge Savaşçı', 'İntikam Yolu', 'Son Hesaplaşma'],
  Dram: ['Kırık Kalp', 'Sessiz Fırtına', 'Son Vedalaşma', 'Kayıp Rüya', 'Yürek Yanığı', 'Umut Işığı', 'Ağlayan Gök', 'İki Dünya', 'Sonbahar Hikayesi', 'Yeni Şafak'],
  Suç: ['Kara Dosya', 'Gizli Tanık', 'Kan İzi', 'Şehir Avcısı', 'Son İpucu', 'Karanlık Sokak', 'Mafya Gölgesi', 'Sahte Kimlik', 'Gizli Oyun', 'Çatlak İş'],
  Gerilim: ['Nefes Kesen', 'Son Kapı', 'Karanlık Ses', 'Gizemli Misafir', 'Sessiz Tehdit', 'Kapan', 'İz Sürücü', 'Gece Korkusu', 'Saklı Oda', 'Son Şans'],
  Komedi: ['Kahkaha Gecesi', 'Komik Kaos', 'Aptal Hırsız', 'Mutlu Kazalar', 'Gülen Yüz', 'Şaka Peşinde', 'Çılgın Aile', 'Komedi Kulübü', 'Gülme Krizi', 'Neşeli Düet'],
  Romantik: ['İlk Bakış', 'Kalp Mesajı', 'Yaz Aşkı', 'Son Dans', 'Gizli Sevgili', 'Yıldızlı Gece', 'Aşk Şehri', 'Pembe Rüya', 'Sonsuz Söz', 'Kalbin Yolu'],
  Aile: ['Mutlu Yuva', 'Çocuklar Gezegeni', 'Aile Macerası', 'Birlikte Güçlü', 'Neşeli Tatil', 'Büyük Aile', 'Kalpten Kalbe', 'Mini Kahramanlar', 'Gülen Ev', 'Paylaşılan Rüya'],
  Belgesel: ['Vahşi Doğa', 'Okyanus Derinliği', 'Dağların Sesi', 'Antik Uygarlıklar', 'Gökyüzü Kuşları', 'Kutup Macerası', 'Ormanın Kalbi', 'Denizaltı Dünyası', 'Çöl Rüzgarı', 'Volkanlar'],
  Gizem: ['Kayıp Anahtar', 'Sır Dolu Ev', 'Gizli Şifre', 'Karanlık Geçmiş', 'Son İz', 'Bulmaca Odası', 'Sessiz Suç', 'Gölge Oyunu', 'Gizemli Ada', 'Şifreli Mesaj'],
  'Stand-up': ['Sahne Işıkları', 'Mikrofon Önünde', 'Kahkaha Sahnesi', 'Komedyen Gecesi', 'Tek Kişilik Show', 'Gülmek Serbest', 'Son Skeç', 'Perde Arkası', 'Komik Anılar', 'Sahne Tozu'],
  'Din Temalı': ['İman Yolu', 'Kutsal Topraklar', 'Hac Yolculuğu', 'Dualı Günler', 'Manevi Yolculuk', 'İlahi Işık', 'İbadet Vakti', 'Peygamber Yolu', 'Kutsal Metin', 'Ruhani Huzur'],
  Klasik: ['Altın Çağ', 'Siyah Beyaz', 'Unutulmaz Kareler', 'Sinema Tarihi', 'Efsane Yapım', 'Vefat Eden Yıldız', 'Klasik Aşk', 'Eski İstanbul', 'Yeşilçam', 'Sinema Arşivi'],
  Korku: ['Gece Kâbusu', 'Lanetli Ev', 'Karanlık Orman', 'Son Çığlık', 'Ölümcül Gece', 'Kanlı Ay', 'Korku Koridoru', 'Gizli Mahzen', 'Hayalet Hikayesi', 'Son Kapı'],
  'Bilim Kurgu': ['Yıldız Geçidi', 'Uzay Kolonisi', 'Zaman Paradoksu', 'Robot İsyanı', 'Galaksi Savaşı', 'Yeni Dünya', 'Yapay Zeka', 'Uzay Gemisi', 'Gelecek Şehri', 'Mars Yolu'],
  Fantastik: ['Ejderha Efsanesi', 'Sihirli Krallık', 'Kayıp Harita', 'Büyücü Okulu', 'Peri Masalı', 'Karanlık Kale', 'Efsanevi Kılıç', 'Büyülü Orman', 'Gölge Kral', 'Sonsuz Destan'],
}

function titlesForGenre(genre: (typeof FEATURED_BROWSE_GENRES)[number]) {
  if (GENRE_TITLES[genre]) return GENRE_TITLES[genre]
  return Array.from({ length: 10 }, (_, index) => `${genre} Hikayesi ${index + 1}`)
}

function slug(genre: string) {
  return genre.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function posterUrl(photoId: string) {
  return `https://images.unsplash.com/${photoId}?w=400&h=600&fit=crop`
}

function backdropUrl(photoId: string) {
  return `https://images.unsplash.com/${photoId}?w=1600&h=900&fit=crop`
}

function pickType(genre: string, index: number) {
  if (genre === 'Belgesel') return 'belgesel'
  if (genre === 'Stand-up') return 'stand-up'
  if (genre === 'Klasik') return 'film'
  if (index % 3 === 0) return 'dizi'
  return 'film'
}

function pickRating(genre: string) {
  if (genre === 'Aile' || genre === 'Belgesel') return 'Genel'
  if (genre === 'Korku' || genre === 'Suç') return '16+'
  return '13+'
}

interface SeedItem {
  id: string
  title: string
  type: string
  genres: string[]
  rating: string
  duration: string
  poster: string
  backdrop: string
  videoUrl: string
  year: number
}

function buildItems(): SeedItem[] {
  const items: SeedItem[] = []
  FEATURED_BROWSE_GENRES.forEach((genre, genreIndex) => {
    titlesForGenre(genre).forEach((title, titleIndex) => {
      const globalIndex = genreIndex * 10 + titleIndex
      const photoId = POSTERS[globalIndex % POSTERS.length]
      const type = pickType(genre, titleIndex)
      items.push({
        id: `genre-${slug(genre)}-${titleIndex + 1}`,
        title,
        type,
        genres: [genre],
        rating: pickRating(genre),
        duration: type === 'dizi' ? `${6 + (titleIndex % 8)} bölüm` : `${88 + (titleIndex % 35)} dk`,
        poster: posterUrl(photoId),
        backdrop: backdropUrl(photoId),
        videoUrl: VIDEOS[globalIndex % VIDEOS.length],
        year: 2021 + (globalIndex % 5),
      })
    })
  })
  return items
}

export const GENRE_ITEMS = buildItems()

function upsertGenreItem(item: SeedItem) {
  const genresJson = JSON.stringify(item.genres)
  const newUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
  const exists = dbGet('SELECT id FROM content WHERE id = ?', [item.id])

  if (exists) {
    if (preserveExistingContent()) return
    dbRun(
      `UPDATE content SET title=?, description=?, year=?, duration=?, rating=?, type=?, genres=?, poster=?, backdrop=?, video_url=?, trailer_url=?, is_new=1, new_until=? WHERE id=?`,
      [item.title, `${item.title} — ${item.genres[0]} türünde özgün yapım.`, item.year, item.duration, item.rating, item.type, genresJson, item.poster, item.backdrop, item.videoUrl, item.videoUrl, newUntil, item.id],
    )
    return
  }

  dbRun(
    `INSERT INTO content (id, title, description, year, duration, rating, type, genres, poster, backdrop, video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom', ?, 'standard', 1, ?, 0)`,
    [item.id, item.title, `${item.title} — ${item.genres[0]} türünde özgün yapım.`, item.year, item.duration, item.rating, item.type, genresJson, item.poster, item.backdrop, item.videoUrl, item.videoUrl, newUntil],
  )
}

export function ensureGenreContentById(contentId: string): boolean {
  const item = GENRE_ITEMS.find((entry) => entry.id === contentId)
  if (!item) return false
  upsertGenreItem(item)
  return true
}

const EDITORIAL_GENRE_ROW_IDS = buildGenreToEditorialIdMap()

export function ensureGenreCatalog() {
  for (const item of GENRE_ITEMS) upsertGenreItem(item)

  FEATURED_BROWSE_GENRES.forEach((genre, index) => {
    const editorialId = EDITORIAL_GENRE_ROW_IDS[genre]
    if (editorialId && dbGet('SELECT id FROM categories WHERE id = ?', [editorialId])) return

    const ids = GENRE_ITEMS.filter((item) => item.genres.includes(genre)).map((item) => item.id)
    const categoryId = `genre-row-${slug(genre)}`
    const exists = dbGet('SELECT id FROM categories WHERE id = ?', [categoryId])
    if (exists) {
      dbRun('UPDATE categories SET title = ? WHERE id = ?', [genre, categoryId])
    } else {
      dbRun('INSERT INTO categories (id, title, sort_order) VALUES (?, ?, ?)', [categoryId, genre, 20 + index])
    }

    const hasItems = dbGet('SELECT content_id FROM category_items WHERE category_id = ? LIMIT 1', [categoryId])
    if (hasItems) return

    ids.forEach((contentId, itemIndex) => {
      dbRun('INSERT INTO category_items (category_id, content_id, sort_order) VALUES (?, ?, ?)', [
        categoryId, contentId, itemIndex,
      ])
    })
  })
}
