import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

const PROGRAM_ROW_SLUGS: Record<string, string> = {
  Filmler: 'filmler',
  'Kısa Filmler': 'kisaFilmler',
  Diziler: 'diziler',
  Belgeseller: 'belgeseller',
  'Stand-up': 'standup',
  Klasikler: 'klasikler',
  'Dikey Diziler': 'dikey',
  'Genç Sinema': 'gencSinema',
}

function isMissingTranslation(key: string, value: string) {
  return !value || value === key || value.endsWith(`.${key.split('.').pop()}`)
}

/** UI labels for genres, category rows, ratings — content titles stay as stored in DB. */
export function useBrowseLabels() {
  const { t } = useTranslation('browse')

  const translateGenre = useCallback(
    (genre: string) => {
      const mapped = t(`genres.${genre}`, { defaultValue: genre })
      return isMissingTranslation(`genres.${genre}`, mapped) ? genre : mapped
    },
    [t],
  )

  const translateCategory = useCallback(
    (title: string) => {
      const trimmed = title.trim()
      const categoryMap = t('categories', { returnObjects: true })
      if (categoryMap && typeof categoryMap === 'object' && trimmed in categoryMap) {
        const mapped = (categoryMap as Record<string, string>)[trimmed]
        if (mapped) return mapped
      }

      const slug = PROGRAM_ROW_SLUGS[trimmed]
      if (slug) {
        const viaSlug = t(slug, { defaultValue: trimmed })
        if (!isMissingTranslation(slug, viaSlug)) return viaSlug
      }

      if (trimmed.startsWith('Ayın ')) {
        return t('monthlyRowTitle', { topic: trimmed.slice(5) })
      }
      if (trimmed.endsWith(' Birincisi')) {
        return t('monthlyWinnerRow', { name: trimmed.replace(/ Birincisi$/, '') })
      }
      return translateGenre(trimmed)
    },
    [t, translateGenre],
  )

  const translateRating = useCallback(
    (rating: string) => {
      const mapped = t(`ratings.${rating}`, { defaultValue: rating })
      return isMissingTranslation(`ratings.${rating}`, mapped) ? rating : mapped
    },
    [t],
  )

  const translateDuration = useCallback(
    (duration: string) => {
      if (!duration) return duration
      return duration
        .replace(/\bdk\b/gi, t('duration.minAbbr'))
        .replace(/\bdakika\b/gi, t('duration.minute'))
        .replace(/\bsn\b/gi, t('duration.secAbbr'))
        .replace(/\bsaat\b/gi, t('duration.hour'))
    },
    [t],
  )

  const translateContentType = useCallback(
    (type: string) => {
      const mapped = t(`contentTypes.${type}`, { defaultValue: type })
      return isMissingTranslation(`contentTypes.${type}`, mapped) ? type : mapped
    },
    [t],
  )

  return {
    t,
    translateGenre,
    translateCategory,
    translateRating,
    translateDuration,
    translateContentType,
  }
}
