import { GENRE_CATALOG_ITEMS } from './genreCatalog'
import { BRAND_NAME } from '../constants/brand'
import { enrichContentImages } from '../utils/contentImages'
import type { ContentItem } from '../types/content'
import type { LandingShowcase } from '../components/landing/LandingCategoryShowcase'

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
  'photo-1440409856334-aa0276a798bf',
  'photo-1518676590699-075c784356cc',
  'photo-1534802046520-4faac9863c63',
  'photo-1598899134739-24aac119118d',
  'photo-1585647340883-22d66d09a0ae',
  'photo-1493225457124-a3eb161ffa5f',
  'photo-1506157782111-bc8984c8cc2a',
  'photo-1514525253161-7a46d19cd819',
  'photo-1529626455594-4ff0802cfb7e',
]

const VERTICAL_POSTERS = [
  'photo-1516589176970-021cd9f9f2f5',
  'photo-1524504388940-b1c1722653e1',
  'photo-1494790108377-be9c29b29330',
  'photo-1529626455594-4ff0802cfb7e',
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1534528741775-53994a69daeb',
  'photo-1506794778202-cad84cf45f1d',
  'photo-1438761681033-6461ffad8d80',
]

const DEMO_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
]

function poster(photoId: string, vertical = false) {
  const size = vertical ? 'w=400&h=711' : 'w=400&h=600'
  return `https://images.unsplash.com/${photoId}?${size}&fit=crop&q=80`
}

function backdrop(photoId: string) {
  return `https://images.unsplash.com/${photoId}?w=1600&h=900&fit=crop&q=80`
}

function makeItem(
  id: string,
  title: string,
  type: ContentItem['type'],
  index: number,
  options: { vertical?: boolean; genres?: string[]; rating?: string } = {},
): ContentItem {
  const photoId = options.vertical ? VERTICAL_POSTERS[index % VERTICAL_POSTERS.length] : POSTERS[index % POSTERS.length]
  return {
    id,
    title,
    description: `${title} — ${BRAND_NAME}'da izle.`,
    year: 2022 + (index % 4),
    duration: type === 'dizi' ? `${8 + (index % 6)} bölüm` : `${90 + (index % 30)} dk`,
    rating: options.rating ?? (index % 3 === 0 ? '16+' : '13+'),
    type,
    genres: options.genres ?? [type === 'film' ? 'Dram' : 'Dizi'],
    poster: poster(photoId, options.vertical),
    backdrop: options.vertical ? poster(photoId, true) : backdrop(photoId),
    videoUrl: DEMO_VIDEOS[index % DEMO_VIDEOS.length],
    trailerUrl: DEMO_VIDEOS[index % DEMO_VIDEOS.length],
    videoFormat: options.vertical ? 'vertical' : 'standard',
  }
}

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

const KISA_TITLES = [
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

function buildItems(
  prefix: string,
  titles: string[],
  type: ContentItem['type'],
  options?: { vertical?: boolean; genres?: string[]; rating?: string },
): ContentItem[] {
  return titles.map((title, index) =>
    makeItem(`${prefix}-${index + 1}`, title, type, index, options),
  )
}

export const DEMO_LANDING_SHOWCASES: LandingShowcase[] = [
  {
    id: 'demo-dizi',
    title: 'Dizi',
    icon: 'dizi',
    description: 'Sezon sezon sürükleyici hikayeler ve orijinal diziler.',
    items: buildItems('demo-dizi', DIZI_TITLES, 'dizi', { genres: ['Dizi', 'Dram'] }),
  },
  {
    id: 'demo-film',
    title: 'Film',
    icon: 'film',
    description: 'Ödüllü yapımlar, festival favorileri ve seçkin sinema.',
    items: buildItems('demo-film', FILM_TITLES, 'film', { genres: ['Film', 'Dram'] }),
  },
  {
    id: 'demo-belgesel',
    title: 'Belgesel',
    icon: 'belgesel',
    description: 'Gerçek hikayeler, derin keşifler ve doğa belgeselleri.',
    items: buildItems('demo-belgesel', BELGESEL_TITLES, 'belgesel', {
      genres: ['Belgesel', 'Doğa'],
      rating: 'Genel',
    }),
  },
  {
    id: 'demo-cocuk',
    title: 'Çocuk',
    icon: 'cocuk',
    description: 'Ailece izlenebilecek güvenli ve eğlenceli içerikler.',
    items: buildItems('demo-cocuk', COCUK_TITLES, 'film', {
      genres: ['Aile', 'Animasyon'],
      rating: 'Genel',
    }),
  },
  {
    id: 'demo-dikey',
    title: 'Dikey Dizi',
    icon: 'dikey',
    description: 'Mobil öncelikli kısa bölümler — kaydır, izle, devam et.',
    items: buildItems('demo-dikey', DIKEY_TITLES, 'dizi', {
      vertical: true,
      genres: ['Romantik', 'Dikey', 'Dram'],
    }),
  },
  {
    id: 'demo-kisa-film',
    title: 'Kısa Film',
    icon: 'film',
    description: 'Festival ödüllü kısa metraj yapımlar.',
    items: buildItems('demo-kisa', KISA_TITLES, 'kisa-film', { genres: ['Kısa Film', 'Dram'] }),
  },
]

export function getDemoCatalog(): ContentItem[] {
  const seen = new Set<string>()
  const all = [...DEMO_LANDING_SHOWCASES.flatMap((showcase) => showcase.items), ...GENRE_CATALOG_ITEMS]
  return all.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

/** Boş veya küçük kurulumlarda demo doldurma; admin özelleştirdiyse devre dışı. */
export const DEMO_CATALOG_MIN_SIZE = 20

export function shouldFillWithDemoCatalog(
  apiCatalog: ContentItem[],
  options?: { adminCustomized?: boolean },
) {
  if (options?.adminCustomized) return false
  return apiCatalog.length < DEMO_CATALOG_MIN_SIZE
}

function enrichCatalogImages(apiCatalog: ContentItem[]) {
  const demoById = new Map(getDemoCatalog().map((item) => [item.id, item]))
  return apiCatalog.map((item) => enrichContentImages(item, demoById.get(item.id)))
}

/** API kataloğu eksikse veya tür satırları için demo + tür kataloğunu ekle */
export function mergeWithDemoCatalog(apiCatalog: ContentItem[]): ContentItem[] {
  const demo = getDemoCatalog()
  const demoById = new Map(demo.map((item) => [item.id, item]))
  const apiIds = new Set(apiCatalog.map((item) => item.id))
  const merged = apiCatalog.map((item) => enrichContentImages(item, demoById.get(item.id)))

  for (const item of demo) {
    if (!apiIds.has(item.id)) merged.push(enrichContentImages(item))
  }

  return merged
}

/** Gerçek katalog yeterliyse yalnızca görselleri zenginleştir; aksi halde demo ile doldur. */
export function resolveCatalogFromApi(
  apiCatalog: ContentItem[],
  options?: { adminCustomized?: boolean },
): ContentItem[] {
  if (shouldFillWithDemoCatalog(apiCatalog, options)) {
    return mergeWithDemoCatalog(apiCatalog)
  }
  return enrichCatalogImages(apiCatalog)
}

/** API vitrin satırları — admin kaydı varsa olduğu gibi kullan; demo yalnızca boş kurulumda. */
export function resolveLandingShowcases(apiShowcases?: LandingShowcase[]): LandingShowcase[] {
  if (!apiShowcases?.length) return DEMO_LANDING_SHOWCASES
  return apiShowcases
}
