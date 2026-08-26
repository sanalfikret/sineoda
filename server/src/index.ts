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
import adminCreatorsRoutes from './routes/adminCreators.js'
import adminMessagesRoutes from './routes/adminMessages.js'
import messagesRoutes from './routes/messages.js'
import adminStudentCinemaRoutes from './routes/adminStudentCinema.js'
import studentCinemaRoutes from './routes/studentCinema.js'
import creatorAuthRoutes from './routes/creatorAuth.js'
import creatorRoutes from './routes/creator.js'
import creatorUploadRoutes from './routes/creatorUpload.js'
import adsRoutes from './routes/ads.js'
import adminAdsRoutes from './routes/adminAds.js'
import adminSiteNavRoutes from './routes/adminSiteNav.js'
import { PUBLISHED_CONTENT_SQL } from './services/publish.js'
import { MAIN_CATALOG_SQL, STANDARD_PROGRAM_SQL, ensureStudentCinemaCatalog } from './services/studentCinema.js'
import { mapCategoriesResponse } from './services/categoryOrder.js'
import { getMonthlyAwardWinnersSql } from './services/studentCinemaAwards.js'
import { mapSiteNavResponse } from './services/siteNav.js'
import { runStartupCategoryMaintenance } from './services/categoryMaintenance.js'
import { backfillMissingImages } from './backfillImages.js'
import { backfillEpisodeVideoUrls } from './services/episodeVideos.js'
import { ensureDemoCatalog } from './demoCatalog.js'
import { ensureGenreCatalog } from './genreCatalog.js'
import { ensureJournalPosts } from './journalSeed.js'
import { ensureCekimNotlariCategories } from './services/cekimNotlariCategories.js'
import { ensureCekimNotlariDemoContent } from './services/cekimNotlariSeed.js'
import adminCekimNotlariRoutes from './routes/adminCekimNotlari.js'
import cekimNotlariRoutes from './routes/cekimNotlari.js'
import { seedDatabase, ensureGenreCategories, seedEpisodes, ensureContentMeta, ensureVerticalSeries, ensureExtraSeedContent, seedLandingData, ensureLandingShowcases, ensureFilmSchools, ensureStudentCinemaDemoFilms, ensureStudentCinemaDemoCredits, ensureCreatorDemoSeed } from './seed.js'
import { ensureMonthlyRollover, seedDemoMonthlyIfEmpty } from './services/watchAccounting.js'
import type { ContentRow } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await initDatabase()
seedDatabase()
seedEpisodes()
ensureContentMeta()
ensureExtraSeedContent()
ensureVerticalSeries()
ensureGenreCategories()
ensureCekimNotlariCategories()
ensureCekimNotlariDemoContent()
seedLandingData()
ensureLandingShowcases()
ensureDemoCatalog()
ensureGenreCatalog()
ensureJournalPosts()
ensureFilmSchools()
ensureStudentCinemaDemoFilms()
ensureStudentCinemaDemoCredits()
ensureCreatorDemoSeed()
backfillMissingImages()
backfillEpisodeVideoUrls()
runStartupCategoryMaintenance()
ensureStudentCinemaCatalog()

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
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Profile-Id'],
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
    features: {
      landing: true,
      contact: true,
      journal: true,
      reactions: true,
      watchlist: true,
      categoryReorder: true,
      creators: true,
      qualifiedWatch: true,
      studentCinema: true,
      adCampaigns: true,
    },
    email: config.isEmailConfigured(),
  })
})

app.get('/api/bootstrap', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    const contentWithMetaSql = `
      SELECT c.*, fs.name AS school_name, u.name AS creator_name
      FROM content c
      LEFT JOIN film_schools fs ON fs.id = c.school_id
      LEFT JOIN creators cr ON cr.id = c.creator_id
      LEFT JOIN users u ON u.id = cr.user_id
    `
    const catalog = dbAll<ContentRow & { school_name: string | null; creator_name: string | null }>(
      `${contentWithMetaSql} WHERE ${PUBLISHED_CONTENT_SQL} AND ${MAIN_CATALOG_SQL} ORDER BY c.title`,
    ).map(mapContent)
    const featured =
      catalog.find(
        (item) => item.featured && item.program !== 'student_cinema',
      ) ??
      catalog.find((item) => item.program !== 'student_cinema') ??
      null
    const trailers = catalog
      .filter((item) => item.trailerUrl && item.program !== 'student_cinema')
      .slice(0, 6)
    const newReleases = catalog
      .filter((item) => item.isNew && item.program !== 'student_cinema')
      .slice(0, 12)
    const studentCinemaPicks = dbAll<ContentRow & { school_name: string | null; creator_name: string | null }>(
      `${contentWithMetaSql}
       WHERE ${PUBLISHED_CONTENT_SQL}
         AND c.program = 'student_cinema'
         AND ${MAIN_CATALOG_SQL}
       ORDER BY c.published_at DESC
       LIMIT 12`,
    ).map(mapContent)

    const studentCinemaMonthlyWinners = dbAll<ContentRow & { school_name: string | null; creator_name: string | null }>(
      `${contentWithMetaSql}
       WHERE ${PUBLISHED_CONTENT_SQL}
         AND c.program = 'student_cinema'
         AND ${MAIN_CATALOG_SQL}
         AND ${getMonthlyAwardWinnersSql()}
       ORDER BY c.monthly_award_period DESC
       LIMIT 12`,
    ).map(mapContent)

    const categories = mapCategoriesResponse()

    let landing = { slider: [] as ReturnType<typeof mapContent>[], showcases: [] as Array<{ id: string; title: string; icon: string; description: string; items: ReturnType<typeof mapContent>[] }> }
    try {
      landing = getLandingConfig()
    } catch {
      // landing tabloları henüz yoksa bootstrap yine de çalışsın
    }

    res.json({
      catalog,
      categories,
      featuredContent: featured,
      trailers,
      newReleases,
      studentCinemaPicks,
      studentCinemaMonthlyWinners,
      siteNav: mapSiteNavResponse(),
      landing,
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Katalog yüklenemedi.',
    })
  }
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
app.use('/api/creator/auth', creatorAuthRoutes)
app.use('/api/creator', creatorRoutes)
app.use('/api/creator/upload', creatorUploadRoutes)
app.use('/api/admin/creators', adminCreatorsRoutes)
app.use('/api/admin/student-cinema', adminStudentCinemaRoutes)
app.use('/api/admin/cekim-notlari', adminCekimNotlariRoutes)
app.use('/api/student-cinema', studentCinemaRoutes)
app.use('/api/cekim-notlari', cekimNotlariRoutes)
app.use('/api/admin/users', userRoutes)
app.use('/api/admin/messages', adminMessagesRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/ads', adsRoutes)
app.use('/api/admin/ads', adminAdsRoutes)
app.use('/api/admin/site-nav', adminSiteNavRoutes)
app.use('/api/admin/upload', uploadRoutes)

if (config.webDistDir) {
  const distPath = path.resolve(config.webDistDir)
  app.use(express.static(distPath, { index: false }))
  app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
  console.log(`Web UI: ${distPath}`)
}

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message || 'Sunucu hatası.' })
})

app.listen(config.port, () => {
  console.log(`Sineoda API http://localhost:${config.port}`)
  console.log(`Uploads: ${uploadsDir}`)
  console.log(`Database: ${path.join(config.dataDir, 'sineoda.db')}`)
  console.log(`Frontend: ${config.frontendUrl}`)
  console.log(`Email: ${config.isEmailConfigured() ? 'configured' : 'dev mode (console log)'}`)

  try {
    ensureMonthlyRollover()
    seedDemoMonthlyIfEmpty()
  } catch (error) {
    console.error('[watch-accounting] startup init failed:', error)
  }
})
