import { describe, expect, it } from 'vitest'
import type { ContentItem } from '../types/content'
import {
  buildFallbackEpisodes,
  formatEpisodeHeading,
  formatEpisodeLabel,
  parseEpisodeCount,
  resolveSeriesEpisodes,
  uniqueSeasons,
} from './episodes'

const series: ContentItem = {
  id: 'kod-kiricilar',
  title: 'Kod Kırıcılar',
  description: 'Test',
  year: 2024,
  duration: '8 bölüm',
  rating: '13+',
  type: 'dizi',
  genres: ['Aksiyon'],
  poster: '',
  backdrop: '',
  videoUrl: 'https://example.com/video.mp4',
}

describe('dizi bölümleri', () => {
  it('süre metninden bölüm sayısını okur', () => {
    expect(parseEpisodeCount('8 bölüm')).toBe(8)
    expect(parseEpisodeCount('2s 14dk')).toBe(8)
  })

  it('bölümü olmayan diziye 3 sezon üretir', () => {
    const episodes = buildFallbackEpisodes(series)
    expect(uniqueSeasons(episodes)).toEqual([1, 2, 3])
    expect(episodes[0]?.title).toBeTruthy()
    expect(formatEpisodeLabel(episodes[0]!)).toMatch(/^S1 B1 · /)
    expect(formatEpisodeHeading(episodes[0]!)).toMatch(/^1\. Bölüm · /)
  })

  it('API bölümleri varsa onları kullanır', () => {
    const fetched = [
      {
        id: 'e1',
        contentId: series.id,
        season: 1,
        episode: 1,
        title: 'Sıfır Gün',
        description: '',
        duration: '48 dk',
        videoUrl: series.videoUrl,
      },
    ]
    const resolved = resolveSeriesEpisodes(series, fetched)
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.title).toBe('Sıfır Gün')
  })
})
