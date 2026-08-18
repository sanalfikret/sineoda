import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { initDatabase, uploadsDir, dbAll } from './db.js'
import { mapContent } from './mappers.js'
import billingRoutes from './routes/billing.js'
import episodeRoutes from './routes/episodes.js'
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categories.js'
import contentRoutes from './routes/content.js'
import reactionsRoutes from './routes/reactions.js'
import uploadRoutes from './routes/upload.js'
import userRoutes from './routes/users.js'
import watchlistRoutes from './routes/watchlist.js'
import watchProgressRoutes from './routes/watchProgress.js'
import analyticsRoutes from './routes/analytics.js'
import adminContentRoutes from './routes/adminContent.js'
import analyticsPublicRoutes from './routes/analyticsPublic.js'
import landingRoutes, { getLandingConfig } from './routes/landing.js'
import contactRoutes from './routes/contact.js'
import journalRoutes from './routes/journal.js'
import adminJournalRoutes from './routes/adminJournal.js'
import { ensureDemoCatalog } from './demoCatalog.js'
import { ensureGenreCatalog } from './genreCatalog.js'
import { ensureJournalPosts } from './journalSeed.js'
import { seedDatabase, ensureGenreCategories, seedEpisodes, ensureContentMeta, ensureVerticalSeries, ensureExtraSeedContent, seedLandingData, ensureLandingShowcases } from './seed.js'
import type { ContentRow } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await initDatabase()
seedDatabase()
seedEpisodes()
ensureContentMeta()
ensureExtraSeedContent()
ensureVerticalSeries()
ensureGenreCategories()
seedLandingData()
ensureLandingShowcases()
ensureDemoCatalog()
ensureGenreCatalog()
ensureJournalPosts()

const app = express()

const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true)
      } else {
        callback(null, true) // geliştirme kolaylığı; production'da sıkılaştırılabilir
      }
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(uploadsDir))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'sineoda-api',
    version: 2,
    features: { landing: true, contact: true, journal: true },
    email: config.isEmailConfigured(),
  })
})

app.get('/api/bootstrap', (_req, res) => {
  const catalog = dbAll<ContentRow>('SELECT * FROM content ORDER BY title').map(mapContent)
  const featured = catalog.find((item) => item.featured) ?? catalog[0] ?? null
  const trailers = catalog.filter((item) => item.trailerUrl).slice(0, 6)
  const newReleases = catalog.filter((item) => item.isNew).slice(0, 12)

  const categories = dbAll<{ id: string; title: string }>(
    'SELECT * FROM categories ORDER BY sort_order, title',
  ).map((category) => ({
    id: category.id,
    title: category.title,
    itemIds: dbAll<{ content_id: string }>(
      'SELECT content_id FROM category_items WHERE category_id = ? ORDER BY sort_order',
      [category.id],
    ).map((row) => row.content_id),
  }))

  let landing = { slider: [] as ReturnType<typeof mapContent>[], showcases: [] as Array<{ id: string; title: string; icon: string; description: string; items: ReturnType<typeof mapContent>[] }> }
  try {
    landing = getLandingConfig()
  } catch {
    // landing tabloları henüz yoksa bootstrap yine de çalışsın
  }

  res.json({ catalog, categories, featuredContent: featured, trailers, newReleases, landing })
})

app.use('/api/analytics', analyticsPublicRoutes)
app.use('/api/landing', landingRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/journal', journalRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/episodes', episodeRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/watch-progress', watchProgressRoutes)
app.use('/api/admin/analytics', analyticsRoutes)
app.use('/api/admin/content', adminContentRoutes)
app.use('/api/admin/journal', adminJournalRoutes)
app.use('/api/watchlist', watchlistRoutes)
app.use('/api/reactions', reactionsRoutes)
app.use('/api/admin/landing', landingRoutes)
app.use('/api/admin/users', userRoutes)
app.use('/api/admin/upload', uploadRoutes)

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message || 'Sunucu hatası.' })
})

app.listen(config.port, () => {
  console.log(`Sineoda API http://localhost:${config.port}`)
  console.log(`Uploads: ${uploadsDir}`)
  console.log(`Database: ${path.join(config.dataDir, 'sineoda.db')}`)
  console.log(`Frontend: ${config.frontendUrl}`)
  console.log(`Email: ${config.isEmailConfigured() ? 'configured' : 'dev mode (console log)'}`)
})
