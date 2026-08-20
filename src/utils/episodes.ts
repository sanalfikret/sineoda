import type { ContentItem, Episode } from '../types/content'
import { isSeriesContent } from '../constants/contentTypes'

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

export const FALLBACK_EPISODE_TITLES = [
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
] as const

export function itemShowsEpisodePicker(item: Pick<ContentItem, 'type' | 'videoFormat'>) {
  return isSeriesContent(item.type) || item.videoFormat === 'vertical'
}

export function parseEpisodeCount(duration: string) {
  const match = duration.match(/(\d+)\s*bölüm/i)
  if (!match) return 8
  return Math.min(Math.max(Number(match[1]), 4), 12)
}

export function formatEpisodeCode(episode: Pick<Episode, 'season' | 'episode'>) {
  return `S${episode.season} B${episode.episode}`
}

export function formatEpisodeLabel(episode: Pick<Episode, 'season' | 'episode' | 'title'>) {
  return `${formatEpisodeCode(episode)} · ${episode.title}`
}

export function formatEpisodeHeading(episode: Pick<Episode, 'episode' | 'title'>) {
  return `${episode.episode}. Bölüm · ${episode.title}`
}

export function uniqueSeasons(episodes: Episode[]) {
  return [...new Set(episodes.map((entry) => entry.season))].sort((a, b) => a - b)
}

export function episodesForSeason(episodes: Episode[], season: number) {
  return [...episodes]
    .filter((entry) => entry.season === season)
    .sort((a, b) => a.episode - b.episode)
}

export function sortEpisodes(episodes: Episode[]) {
  return [...episodes].sort((a, b) => a.season - b.season || a.episode - b.episode)
}

export function buildFallbackEpisodes(item: ContentItem): Episode[] {
  const vertical = item.videoFormat === 'vertical'
  const seasonCount = vertical ? 1 : 3
  const perSeason = vertical ? Math.max(parseEpisodeCount(item.duration), 8) : parseEpisodeCount(item.duration)
  const duration = vertical ? '4 dk' : '45 dk'
  const episodes: Episode[] = []

  for (let season = 1; season <= seasonCount; season += 1) {
    for (let episode = 1; episode <= perSeason; episode += 1) {
      const titleIndex = (season * 11 + episode) % FALLBACK_EPISODE_TITLES.length
      const videoIndex = (season * perSeason + episode) % DEMO_VIDEOS.length
      episodes.push({
        id: `${item.id}-s${season}e${episode}`,
        contentId: item.id,
        season,
        episode,
        title: FALLBACK_EPISODE_TITLES[titleIndex],
        description: `${item.title} · Sezon ${season}, ${episode}. bölüm.`,
        duration,
        videoUrl: item.videoUrl?.trim() || DEMO_VIDEOS[videoIndex],
      })
    }
  }

  return episodes
}

export function resolveSeriesEpisodes(item: ContentItem, fetched: Episode[]) {
  if (fetched.length > 0) return sortEpisodes(fetched)
  if (!itemShowsEpisodePicker(item)) return []
  return buildFallbackEpisodes(item)
}
