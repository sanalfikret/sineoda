import type { ContentCategory, ContentItem } from '../types/content'

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

export const SEED_CATALOG: ContentItem[] = [
  {
    id: 'aurora-dreams',
    title: 'Aurora Rüyaları',
    description:
      'Kuzey ışıklarının altında geçen, kayıp bir kız kardeşi arayan genç bir bilim insanının duygusal yolculuğu.',
    year: 2025,
    duration: '2s 14dk',
    rating: '13+',
    type: 'film',
    genres: ['Dram', 'Bilim Kurgu'],
    poster:
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600&h=900&fit=crop',
    videoUrl: V.tears,
    featured: true,
  },
  {
    id: 'midnight-istanbul',
    title: 'Gece Yarısı İstanbul',
    description:
      'Bir müzisyenin şehrin gizli katmanlarında kendini bulma hikayesi. Müzik, melankoli ve umut.',
    year: 2024,
    duration: '1s 58dk',
    rating: '16+',
    type: 'film',
    genres: ['Dram', 'Müzikal'],
    poster:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&h=900&fit=crop',
    videoUrl: V.sintel,
  },
  {
    id: 'silent-forest',
    title: 'Sessiz Orman',
    description:
      'Kaybolan bir köyün sırrını çözmeye çalışan belgesel ekibinin gerilim dolu macerası.',
    year: 2023,
    duration: '1s 42dk',
    rating: '18+',
    type: 'film',
    genres: ['Gerilim', 'Gizem'],
    poster:
      'https://images.unsplash.com/photo-1509281373367-fa7cf25a27f8?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&h=900&fit=crop',
    videoUrl: V.elephants,
  },
  {
    id: 'ocean-whispers',
    title: 'Okyanus Fısıltıları',
    description:
      'Derin denizlerin altında keşfedilen antik bir medeniyet, insanlığın kaderini değiştirebilir.',
    year: 2025,
    duration: '2s 5dk',
    rating: '13+',
    type: 'film',
    genres: ['Macera', 'Fantastik'],
    poster:
      'https://images.unsplash.com/photo-1535016120720-40c6464ebe02?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&h=900&fit=crop',
    videoUrl: V.escapes,
  },
  {
    id: 'code-breakers',
    title: 'Kod Kırıcılar',
    description:
      'Genç hacker ekibi, küresel bir siber saldırıyı durdurmak için zamana karşı yarışıyor.',
    year: 2024,
    duration: '8 bölüm',
    rating: '13+',
    type: 'dizi',
    genres: ['Aksiyon', 'Dizi'],
    poster:
      'https://images.unsplash.com/photo-1611162617474-5b21e939e113?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=900&fit=crop',
    videoUrl: V.blazes,
  },
  {
    id: 'golden-era',
    title: 'Altın Çağ',
    description:
      "1950'ler sinemasının perde arkasına dair nostaljik ve büyüleyici bir belgesel.",
    year: 2022,
    duration: '1s 28dk',
    rating: 'Genel',
    type: 'film',
    genres: ['Belgesel', 'Tarih'],
    poster:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600&h=900&fit=crop',
    videoUrl: V.bunny,
  },
  {
    id: 'wind-road',
    title: 'Rüzgar Yolu',
    description:
      "Anadolu'nun küçük bir kasabasında geçen, aile bağlarını anlatan sıcak bir drama.",
    year: 2023,
    duration: '1s 52dk',
    rating: '13+',
    type: 'film',
    genres: ['Dram', 'Yerli'],
    poster:
      'https://images.unsplash.com/photo-1594909128353-aa2d4ae0e8fb?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=900&fit=crop',
    videoUrl: V.subaru,
  },
  {
    id: 'neon-pulse',
    title: 'Neon Nabız',
    description:
      'Geleceğin mega şehrinde bir dedektifin çözülmesi imkansız görünen bir cinayet vakası.',
    year: 2025,
    duration: '10 bölüm',
    rating: '16+',
    type: 'dizi',
    genres: ['Noir', 'Dizi'],
    poster:
      'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=900&fit=crop',
    videoUrl: V.meltdowns,
  },
  {
    id: 'little-stars',
    title: 'Küçük Yıldızlar',
    description:
      'Çocukluk hayallerini takip eden genç bir astronot adayının ilham verici hikayesi.',
    year: 2024,
    duration: '1s 36dk',
    rating: 'Genel',
    type: 'film',
    genres: ['Aile', 'Macera'],
    poster:
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1419242902214-272b4f66ee7a?w=1600&h=900&fit=crop',
    videoUrl: V.fun,
  },
  {
    id: 'chef-table',
    title: 'Şef Masası',
    description:
      'Dünyanın dört bir yanından şeflerin mutfak felsefelerini anlatan görsel bir şölen.',
    year: 2023,
    duration: '6 bölüm',
    rating: 'Genel',
    type: 'dizi',
    genres: ['Belgesel', 'Yemek'],
    poster:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=600&fit=crop',
    backdrop:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop',
    videoUrl: V.joyrides,
  },
]

export const SEED_CATEGORIES: ContentCategory[] = [
  {
    id: 'trending',
    title: 'Bu Hafta Trend',
    itemIds: ['aurora-dreams', 'neon-pulse', 'code-breakers', 'ocean-whispers'],
  },
  {
    id: 'new',
    title: 'Yeni Eklenenler',
    itemIds: ['aurora-dreams', 'ocean-whispers', 'neon-pulse', 'little-stars'],
  },
  {
    id: 'series',
    title: 'Popüler Diziler',
    itemIds: ['code-breakers', 'neon-pulse', 'chef-table'],
  },
  {
    id: 'local',
    title: 'Yerli Yapımlar',
    itemIds: ['wind-road', 'midnight-istanbul', 'golden-era'],
  },
  {
    id: 'documentary',
    title: 'Belgeseller',
    itemIds: ['golden-era', 'chef-table', 'silent-forest'],
  },
]
