import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'

const VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
]

const EPISODE_TITLES = [
  'Başlangıç',
  'İlk İz',
  'Sırlar',
  'Kırılma',
  'Gölgeler',
  'İttifak',
  'Yüzleşme',
  'Dönüm Noktası',
  'Kaçış',
  'İhanet',
  'Umut',
  'Son Hamle',
  'Yeni Cephe',
  'Kayıp',
  'Gece',
  'Fırtına',
  'Sessizlik',
  'Ateş Hattı',
  'Kapanış',
  'Final',
]

const SEED_SERIES_EXTRA_SEASONS: Record<string, Array<[number, number, string, string, string]>> = {
  'code-breakers': [
    [2, 1, 'Çifte Ajan', 'Ekibe sızan biri vardır.', '49 dk'],
    [2, 2, 'Kara Kutu', 'Saldırının kaynağı bulunuyor.', '52 dk'],
    [2, 3, 'Kapan', 'Son sunucu devreye alınır.', '50 dk'],
    [3, 1, 'Yeni Dünya', 'Zafer kısa sürer.', '48 dk'],
    [3, 2, 'Gölge Ağ', 'Daha büyük bir tehdit belirir.', '51 dk'],
    [3, 3, 'Son Şifre', 'Her şey bir koda bağlıdır.', '54 dk'],
  ],
  'neon-pulse': [
    [2, 1, 'Kırmızı Işık', 'Yeni bir cinayet zinciri başlar.', '44 dk'],
    [2, 2, 'Yeraltı', 'Şehrin altındaki ağ ortaya çıkar.', '46 dk'],
    [2, 3, 'Ayna', 'Dedektif kendi geçmişiyle yüzleşir.', '45 dk'],
    [3, 1, 'Sessiz Alarm', 'Sistem çöker.', '43 dk'],
    [3, 2, 'Son Nabız', 'Katil çok yakındadır.', '47 dk'],
    [3, 3, 'Şafak', 'Neon sönmeden önce bir seçim yapılır.', '48 dk'],
  ],
  'chef-table': [
    [2, 1, 'Gaziantep', 'Baharatın başkenti.', '39 dk'],
    [2, 2, 'Karadeniz', 'Hamsi ve mısır ekmeği.', '41 dk'],
    [2, 3, 'Kapadokya', 'Peri bacalarında sofra.', '40 dk'],
    [3, 1, 'Trakya', 'Şarap ve peynir.', '38 dk'],
    [3, 2, 'Akdeniz', 'Narenciye ve deniz.', '42 dk'],
    [3, 3, 'Anadolu Sofrası', 'Sezon finali: ortak masa.', '44 dk'],
  ],
}

function parseEpisodeCount(duration: string) {
  const match = duration.match(/(\d+)\s*bölüm/i)
  if (!match) return 8
  return Math.min(Math.max(Number(match[1]), 4), 12)
}

function insertEpisode(
  contentId: string,
  season: number,
  episode: number,
  title: string,
  description: string,
  duration: string,
  videoUrl: string,
  sortOrder: number,
) {
  const exists = dbGet(
    'SELECT id FROM episodes WHERE content_id = ? AND season = ? AND episode_number = ?',
    [contentId, season, episode],
  )
  if (exists) return
  dbRun(
    `INSERT INTO episodes (id, content_id, season, episode_number, title, description, duration, video_url, stream_provider, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'custom', ?)`,
    [uuid(), contentId, season, episode, title, description, duration, videoUrl, sortOrder],
  )
}

function fillEmptySeries(row: {
  id: string
  title: string
  duration: string
  video_url: string
  video_format: string | null
}) {
  const vertical = row.video_format === 'vertical'
  const seasonCount = vertical ? 1 : 3
  const perSeason = vertical ? Math.max(parseEpisodeCount(row.duration), 8) : parseEpisodeCount(row.duration)
  const duration = vertical ? '4 dk' : '45 dk'

  for (let season = 1; season <= seasonCount; season += 1) {
    for (let episode = 1; episode <= perSeason; episode += 1) {
      const title = EPISODE_TITLES[(season * 11 + episode) % EPISODE_TITLES.length]
      const videoUrl = row.video_url?.trim() || VIDEOS[(season * perSeason + episode) % VIDEOS.length]
      insertEpisode(
        row.id,
        season,
        episode,
        title,
        `${row.title} · Sezon ${season}, ${episode}. bölüm.`,
        duration,
        videoUrl,
        episode - 1,
      )
    }
  }
}

export function ensureSeriesEpisodes() {
  const series = dbAll<{
    id: string
    title: string
    duration: string
    video_url: string
    video_format: string | null
  }>(
    `SELECT id, title, duration, video_url, video_format
     FROM content
     WHERE type = 'dizi' OR video_format = 'vertical'`,
  )

  for (const row of series) {
    const count = dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM episodes WHERE content_id = ?',
      [row.id],
    )
    if ((count?.count ?? 0) > 0) continue
    fillEmptySeries(row)
  }

  for (const [contentId, extras] of Object.entries(SEED_SERIES_EXTRA_SEASONS)) {
    const exists = dbGet('SELECT id FROM content WHERE id = ?', [contentId])
    if (!exists) continue
    const video = dbGet<{ video_url: string }>('SELECT video_url FROM content WHERE id = ?', [contentId])
    for (const [season, episode, title, description, duration] of extras) {
      insertEpisode(
        contentId,
        season,
        episode,
        title,
        description,
        duration,
        video?.video_url || VIDEOS[episode % VIDEOS.length],
        episode - 1,
      )
    }
  }
}
