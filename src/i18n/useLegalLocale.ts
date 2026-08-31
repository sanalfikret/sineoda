import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LEGAL_DOCUMENTS, LEGAL_LINKS, type LegalDocument, type LegalSlug } from '../constants/legal'
import enLegalDocs from '../locales/en/legalDocuments.json'
import { useLocale } from './LocaleContext'

type EnLegalDoc = (typeof enLegalDocs)[LegalSlug]

function mergeEnDocument(slug: LegalSlug, trDoc: LegalDocument): LegalDocument {
  const en = enLegalDocs[slug] as EnLegalDoc | undefined
  if (!en) return trDoc
  return {
    slug,
    title: en.title,
    updatedAt: en.updatedAt,
    sections: en.sections,
  }
}

export function useLocalizedLegalDocuments(baseDocuments: Record<LegalSlug, LegalDocument>) {
  const { locale } = useLocale()
  const { t } = useTranslation()

  return useMemo(() => {
    const docs =
      locale === 'en'
        ? (Object.keys(baseDocuments) as LegalSlug[]).reduce(
            (acc, slug) => {
              acc[slug] = mergeEnDocument(slug, baseDocuments[slug] ?? LEGAL_DOCUMENTS[slug])
              return acc
            },
            {} as Record<LegalSlug, LegalDocument>,
          )
        : baseDocuments

    const links = LEGAL_LINKS.map((link) => ({
      ...link,
      label: t(`footer.${link.slug === 'kullanim-kosullari' ? 'terms' : link.slug === 'gizlilik-politikasi' ? 'privacy' : link.slug === 'kvkk-aydinlatma' ? 'kvkk' : link.slug === 'acik-riza-metni' ? 'consent' : 'cookies'}`),
    }))

    return { documents: docs, links }
  }, [baseDocuments, locale, t])
}
