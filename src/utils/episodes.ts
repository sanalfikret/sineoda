import type { Episode } from '../types/content'

export function sortEpisodes(episodes: Episode[]): Episode[] {
  return [...episodes].sort((a, b) => a.season - b.season || a.episode - b.episode)
}

export function groupEpisodesBySeason(episodes: Episode[]): Array<[number, Episode[]]> {
  const sorted = sortEpisodes(episodes)
  const groups = new Map<number, Episode[]>()

  for (const episode of sorted) {
    const list = groups.get(episode.season) ?? []
    list.push(episode)
    groups.set(episode.season, list)
  }

  return [...groups.entries()].sort(([a], [b]) => a - b)
}

export function nextEpisodeNumber(episodes: Episode[], season: number): number {
  const inSeason = episodes.filter((episode) => episode.season === season)
  if (inSeason.length === 0) return 1
  return Math.max(...inSeason.map((episode) => episode.episode)) + 1
}

export function parseBulkLines(value: string, count: number): string[] {
  const lines = value.split('\n').map((line) => line.trim())
  return Array.from({ length: count }, (_, index) => lines[index] ?? '')
}
