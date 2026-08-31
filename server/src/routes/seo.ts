import { Router } from 'express'
import { config } from '../config.js'
import { dbAll } from '../db.js'

const router = Router()

function siteOrigin() {
  return config.frontendUrl.replace(/\/$/, '')
}

router.get('/robots.txt', (_req, res) => {
  const origin = siteOrigin()
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /creator/\nDisallow: /hesap\nDisallow: /profiller\nDisallow: /mesajlar\n\nSitemap: ${origin}/sitemap.xml\n`,
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

export default router
