import type { ContentCredits } from '../types/content'

function splitNames(value: string) {
  return value
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function creditsToForm(credits: ContentCredits = {}) {
  return {
    directors: (credits.directors ?? []).join('\n'),
    producers: (credits.producers ?? []).join('\n'),
    cast: (credits.cast ?? []).join('\n'),
    studio: credits.studio ?? '',
  }
}

export function buildCredits(form: {
  directors: string
  producers: string
  cast: string
  studio: string
}): ContentCredits {
  return {
    directors: splitNames(form.directors),
    producers: splitNames(form.producers),
    cast: splitNames(form.cast),
    studio: form.studio.trim(),
    audioLanguages: ['Türkçe'],
    subtitleLanguages: ['Türkçe', 'Türkçe [CC]'],
  }
}
