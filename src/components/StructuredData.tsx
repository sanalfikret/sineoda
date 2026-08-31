import { useEffect } from 'react'

const SCRIPT_ATTR = 'data-structured-data'

function upsertJsonLd(id: string, payload: Record<string, unknown>) {
  const selector = `script[${SCRIPT_ATTR}="${id}"]`
  let element = document.querySelector<HTMLScriptElement>(selector)
  if (!element) {
    element = document.createElement('script')
    element.type = 'application/ld+json'
    element.setAttribute(SCRIPT_ATTR, id)
    document.head.appendChild(element)
  }
  element.textContent = JSON.stringify(payload)
}

function removeJsonLd(id: string) {
  document.querySelector(`script[${SCRIPT_ATTR}="${id}"]`)?.remove()
}

export function WebSiteStructuredData() {
  useEffect(() => {
    const origin = window.location.origin
    upsertJsonLd('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Plooy',
      url: origin,
      description: 'Bağımsız sinema platformu — festival filmleri, diziler ve belgeseller.',
      inLanguage: 'tr-TR',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${origin}/?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    })

    upsertJsonLd('organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Plooy',
      url: origin,
      logo: `${origin}/brand/plooy-wordmark.png`,
    })

    return () => {
      removeJsonLd('website')
      removeJsonLd('organization')
    }
  }, [])

  return null
}

export interface VideoStructuredDataProps {
  title: string
  description: string
  thumbnailUrl: string
  pageUrl: string
  uploadDate?: string | null
  duration?: string | null
  contentType?: string | null
}

export function VideoStructuredData({
  title,
  description,
  thumbnailUrl,
  pageUrl,
  uploadDate,
  duration,
  contentType,
}: VideoStructuredDataProps) {
  useEffect(() => {
    const schemaType =
      contentType === 'series' || contentType === 'vertical_series' ? 'TVSeries' : 'Movie'

    upsertJsonLd('video', {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name: title,
      description,
      image: thumbnailUrl,
      url: pageUrl,
      ...(uploadDate ? { datePublished: uploadDate } : {}),
      ...(duration ? { duration } : {}),
      potentialAction: {
        '@type': 'WatchAction',
        target: pageUrl,
      },
    })

    return () => removeJsonLd('video')
  }, [title, description, thumbnailUrl, pageUrl, uploadDate, duration, contentType])

  return null
}
