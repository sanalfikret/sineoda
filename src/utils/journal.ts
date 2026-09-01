import type { Locale } from '../i18n/paths'

export function formatJournalDate(value: string | null, locale: Locale = 'tr') {
  if (!value) return ''
  const tag = locale === 'en' ? 'en-US' : 'tr-TR'
  return new Date(value).toLocaleDateString(tag, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function journalBodyParagraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}
