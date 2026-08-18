export interface ContentCredits {
  directors?: string[]
  producers?: string[]
  cast?: string[]
  studio?: string
  audioLanguages?: string[]
  subtitleLanguages?: string[]
}

export interface ContentCreditsInput {
  directors?: string[]
  producers?: string[]
  cast?: string[]
  studio?: string
  audioLanguages?: string[]
  subtitleLanguages?: string[]
}

export function parseCredits(value?: string | null): ContentCredits {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as ContentCreditsInput
    return {
      directors: parsed.directors ?? [],
      producers: parsed.producers ?? [],
      cast: parsed.cast ?? [],
      studio: parsed.studio ?? '',
      audioLanguages: parsed.audioLanguages ?? ['Türkçe'],
      subtitleLanguages: parsed.subtitleLanguages ?? ['Türkçe'],
    }
  } catch {
    return {}
  }
}

export function serializeCredits(credits: ContentCreditsInput | unknown) {
  if (!credits || typeof credits !== 'object') return '{}'
  const input = credits as ContentCreditsInput
  return JSON.stringify({
    directors: input.directors ?? [],
    producers: input.producers ?? [],
    cast: input.cast ?? [],
    studio: input.studio ?? '',
    audioLanguages: input.audioLanguages ?? ['Türkçe'],
    subtitleLanguages: input.subtitleLanguages ?? ['Türkçe'],
  })
}

export function creditsToForm(credits: ContentCredits = {}) {
  return {
    directors: (credits.directors ?? []).join(', '),
    producers: (credits.producers ?? []).join(', '),
    cast: (credits.cast ?? []).join(', '),
    studio: credits.studio ?? '',
  }
}

export function buildCredits(form: {
  directors: string
  producers: string
  cast: string
  studio: string
}): ContentCredits {
  const split = (value: string) =>
    value
      .split(/[,\n]/)
      .map((part) => part.trim())
      .filter(Boolean)

  return {
    directors: split(form.directors),
    producers: split(form.producers),
    cast: split(form.cast),
    studio: form.studio.trim(),
    audioLanguages: ['Türkçe'],
    subtitleLanguages: ['Türkçe', 'Türkçe [CC]'],
  }
}
