import type { SubtitleTrack } from '../types/content'

export function buildSubtitles(tr?: string, en?: string): SubtitleTrack[] {
  const tracks: SubtitleTrack[] = []
  if (tr?.trim()) tracks.push({ lang: 'tr', label: 'Türkçe', url: tr.trim() })
  if (en?.trim()) tracks.push({ lang: 'en', label: 'English', url: en.trim() })
  return tracks
}

export function subtitlesToForm(tracks: SubtitleTrack[] = []) {
  return {
    subtitleTr: tracks.find((track) => track.lang === 'tr')?.url ?? '',
    subtitleEn: tracks.find((track) => track.lang === 'en')?.url ?? '',
  }
}
