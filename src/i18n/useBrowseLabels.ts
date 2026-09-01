import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/** UI labels for genres, category rows, ratings — content titles stay as stored in DB. */
export function useBrowseLabels() {
  const { t } = useTranslation('browse')

  const translateGenre = useCallback(
    (genre: string) => t(`genres.${genre}`, { defaultValue: genre }),
    [t],
  )

  const translateCategory = useCallback(
    (title: string) => {
      const trimmed = title.trim()
      const mapped = t(`categories.${trimmed}`, { defaultValue: '' })
      if (mapped) return mapped
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
    (rating: string) => t(`ratings.${rating}`, { defaultValue: rating }),
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
    (type: string) => t(`contentTypes.${type}`, { defaultValue: type }),
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
