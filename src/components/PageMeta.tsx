import { useEffect } from 'react'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'

const DEFAULT_DESCRIPTION =
  'Plooy — bağımsız sinema platformu. Festival filmleri, belgeseller, diziler ve Genç Sinema seçkisi.'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return
  let element = document.querySelector(`meta[${attr}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  if (!href) return
  let element = document.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export interface PageMetaProps {
  title?: string
  description?: string
  image?: string | null
  path?: string
  noIndex?: boolean
}

export function PageMeta({ title, description, image, path, noIndex = false }: PageMetaProps) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${BRAND_NAME}` : `${BRAND_NAME} — ${BRAND_TAGLINE}`
    const pageDescription = description?.trim() || DEFAULT_DESCRIPTION
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const pageUrl = path && origin ? `${origin}${path.startsWith('/') ? path : `/${path}`}` : origin + (typeof window !== 'undefined' ? window.location.pathname : '')
    const imageUrl = image
      ? image.startsWith('http')
        ? image
        : origin
          ? `${origin}${image.startsWith('/') ? image : `/${image}`}`
          : image
      : origin
        ? `${origin}/brand/plooy-wordmark.png`
        : '/brand/plooy-wordmark.png'

    document.title = pageTitle
    upsertMeta('name', 'description', pageDescription)
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:site_name', BRAND_NAME)
    upsertMeta('property', 'og:title', pageTitle)
    upsertMeta('property', 'og:description', pageDescription)
    upsertMeta('property', 'og:url', pageUrl)
    upsertMeta('property', 'og:image', imageUrl)
    upsertMeta('property', 'og:locale', 'tr_TR')
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', pageTitle)
    upsertMeta('name', 'twitter:description', pageDescription)
    upsertMeta('name', 'twitter:image', imageUrl)
    upsertLink('canonical', pageUrl)
  }, [title, description, image, path, noIndex])

  return null
}
