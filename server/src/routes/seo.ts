import { Router } from 'express'
import { config } from '../config.js'
import { dbAll } from '../db.js'
import { backdropUrlForId, posterUrlForId } from '../services/contentImages.js'

const router = Router()

function siteOrigin() {
  return config.frontendUrl.replace(/\/$/, '')
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function absoluteMediaUrl(path: string | null | undefined) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}

function thumbnailForContent(row: {
  id: string
  poster: string | null
  backdrop: string | null
  video_format: string | null
}) {
  const vertical = row.video_format === 'vertical'
  const poster = row.poster?.trim()
  if (poster && !poster.includes('placeholder') && (poster.startsWith('http') || poster.startsWith('/'))) {
    return absoluteMediaUrl(poster)
  }
  const backdrop = row.backdrop?.trim()
  if (
    !vertical &&
    backdrop &&
    !backdrop.includes('placeholder') &&
    !backdrop.includes('h=600') &&
    (backdrop.startsWith('http') || backdrop.startsWith('/'))
  ) {
    return absoluteMediaUrl(backdrop)
  }
  return vertical ? posterUrlForId(row.id, true) : backdropUrlForId(row.id)
}

router.get('/robots.txt', (_req, res) => {
  const origin = siteOrigin()
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /creator/\nDisallow: /hesap\nDisallow: /profiller\nDisallow: /mesajlar\n\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/video-sitemap.xml\n`,
  )
})

router.get('/sitemap.xml', (_req, res) => {
  const origin = siteOrigin()
  const now = new Date().toISOString().slice(0, 10)

  const staticPaths = [
    '/',
    '/tanitim',
    '/planlar',
    '/dergi',
    '/iletisim',
    '/filmler',
    '/diziler',
    '/belgeseller',
    '/stand-up',
    '/kisa-filmler',
    '/dikey-diziler',
    '/genc-sinema',
    '/cekim-notlari',
  ]

  const contentRows = dbAll<{ id: string; published_at: string | null }>(
    `SELECT id, published_at FROM content
     WHERE COALESCE(review_status, 'published') = 'published'
     ORDER BY title ASC`,
  )

  const journalRows = dbAll<{ slug: string; updated_at: string | null; published_at: string | null }>(
    `SELECT slug, updated_at, published_at FROM journal_posts
     WHERE status = 'published'
     ORDER BY published_at DESC`,
  )

  const urls: Array<{ loc: string; lastmod: string }> = []

  for (const path of staticPaths) {
    urls.push({ loc: `${origin}${path}`, lastmod: now })
  }

  for (const row of contentRows) {
    const lastmod = (row.published_at ?? now).slice(0, 10)
    urls.push({ loc: `${origin}/icerik/${row.id}`, lastmod })
  }

  for (const row of journalRows) {
    const lastmod = (row.updated_at ?? row.published_at ?? now).slice(0, 10)
    urls.push({ loc: `${origin}/dergi/${row.slug}`, lastmod })
  }

  const body = urls
    .map(
      (entry) =>
        `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`,
    )
    .join('\n')

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  )
})

router.get('/video-sitemap.xml', (_req, res) => {
  const origin = siteOrigin()

  const contentRows = dbAll<{
    id: string
    title: string
    description: string
    poster: string | null
    backdrop: string | null
    video_format: string | null
    published_at: string | null
    updated_at: string | null
  }>(
    `SELECT id, title, description, poster, backdrop, video_format, published_at, updated_at FROM content
     WHERE COALESCE(review_status, 'published') = 'published'
     ORDER BY published_at DESC`,
  )

  const entries = contentRows
    .map((row) => {
      const thumbnail = thumbnailForContent(row)
      if (!thumbnail) return ''

      const pageUrl = `${origin}/icerik/${row.id}`
      const lastmod = (row.updated_at ?? row.published_at ?? new Date().toISOString()).slice(0, 10)
      const title = escapeXml(row.title)
      const description = escapeXml((row.description || row.title).slice(0, 2048))

      return `  <url>\n    <loc>${pageUrl}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <video:video>\n      <video:thumbnail_loc>${escapeXml(thumbnail)}</video:thumbnail_loc>\n      <video:title>${title}</video:title>\n      <video:description>${description}</video:description>\n      <video:publication_date>${lastmod}</video:publication_date>\n      <video:family_friendly>yes</video:family_friendly>\n      <video:requires_subscription>yes</video:requires_subscription>\n      <video:platform relationship="allow">web</video:platform>\n      <video:platform relationship="allow">mobile</video:platform>\n      <video:platform relationship="allow">tv</video:platform>\n    </video:video>\n  </url>`
    })
    .filter(Boolean)
    .join('\n')

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${entries}\n</urlset>\n`,
  )
})

export default router
