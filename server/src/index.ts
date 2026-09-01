import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { BRAND_NAME } from './constants/brand.js'
import { initDatabase, uploadsDir, dbAll, dbGet, getDbPath } from './db.js'
import { mapContent } from './mappers.js'
import billingRoutes from './routes/billing.js'
import episodeRoutes from './routes/episodes.js'
import { resolveJwtExpiresIn, type AuthRequest } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categories.js'
import contentRoutes from './routes/content.js'
import reactionsRoutes from './routes/reactions.js'
import uploadRoutes from './routes/upload.js'
import userRoutes from './routes/users.js'
import watchlistRoutes from './routes/watchlist.js'
import watchProgressRoutes from './routes/watchProgress.js'
import playbackRoutes from './routes/playback.js'
import analyticsRoutes from './routes/analytics.js'
import adminContentRoutes from './routes/adminContent.js'
import analyticsPublicRoutes from './routes/analyticsPublic.js'
import landingRoutes, { getLandingConfig } from './routes/landing.js'
import contactRoutes from './routes/contact.js'
import adminLegalRoutes from './routes/adminLegal.js'
import legalRoutes from './routes/legal.js'
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
import seoRoutes from './routes/seo.js'
import adminSiteNavRoutes from './routes/adminSiteNav.js'
import adminSiteModeRoutes from './routes/adminSiteMode.js'
import siteModeRoutes from './routes/siteMode.js'
import { PUBLISHED_CONTENT_SQL_C } from './services/publish.js'
import { STANDARD_PROGRAM_SQL_C, MAIN_CATALOG_SQL_C, ensureStudentCinemaCatalog } from './services/studentCinema.js'
import { mapCategoriesResponse, getCategoryOrderForBrowse } from './services/categoryOrder.js'
import {
  fetchStudentCinemaMonthlyWinnersFallback,
  fetchStudentCinemaPicksFallback,
} from './services/landingStudentRows.js'
import { mapSiteNavResponse } from './services/siteNav.js'
import { getSiteMode } from './services/siteMode.js'
import { listCekimNotlariSections } from './services/cekimNotlari.js'
import { runStartupCategoryMaintenance } from './services/categoryMaintenance.js'
import { backfillMissingImages } from './backfillImages.js'
import { backfillEpisodeVideoUrls } from './services/episodeVideos.js'
import { ensureDemoCatalog } from './demoCatalog.js'
import { ensureGenreCatalog } from './genreCatalog.js'
import { ensureJournalPosts } from './journalSeed.js'
import { ensureCekimNotlariCategories } from './services/cekimNotlariCategories.js'
import { ensureCekimNotlariDemoContent } from './services/cekimNotlariSeed.js'
import adminCekimNotlariRoutes from './routes/adminCekimNotlari.js'
import adminBillingPlansRoutes from './routes/adminBillingPlans.js'
import cekimNotlariRoutes from './routes/cekimNotlari.js'
import {
  seedDatabase,
  ensureGenreCategories,
  seedEpisodes,
  ensureContentMeta,
  ensureVerticalSeries,
  ensureExtraSeedContent,
  seedLandingData,
  ensureLandingShowcases,
  ensureFilmSchools,
  ensureStudentCinemaDemoFilms,
  ensureStudentCinemaDemoCredits,
  ensureCreatorDemoSeed,
  migrateLegacyBrandAccounts,
} from './seed.js'
import { migrateLegacyBrandText } from './services/brandMigration.js'
import { ensureMonthlyRollover, seedDemoMonthlyIfEmpty } from './services/watchAccounting.js'
import type { ContentRow } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await initDatabase()
migrateLegacyBrandAccounts()
migrateLegacyBrandText()
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

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(null, true) // geliştirme kolaylığı; production'da sıkılaştırılabilir
      }
    },
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Profile-Id'],
    exposedHeaders: ['X-Plooy-Token', 'X-Sineoda-Token'],
  }),
)
app.use((req, res, next) => {
  const originalJson = res.json.bind(res)
  res.json = (body: unknown) => {
    const refreshedToken = (req as AuthRequest).refreshedToken
    if (
      refreshedToken &&
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      !('token' in (body as Record<string, unknown>))
    ) {
      return originalJson({ ...(body as Record<string, unknown>), token: refreshedToken })
    }
    return originalJson(body)
  }
  next()
})
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(uploadsDir))

app.get('/api/health', (_req, res) => {
  const dbFile = getDbPath()
  let dbSizeBytes = 0
  let dbExists = false
  try {
    dbExists = fs.existsSync(dbFile)
    if (dbExists) dbSizeBytes = fs.statSync(dbFile).size
  } catch {
    dbExists = false
  }
  const userCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM users')?.count ?? 0

  res.json({
    ok: true,
    service: 'plooy-api',
    version: 2,
    storage: {
      dataDir: config.dataDir,
      uploadsDir: config.uploadsDir,
      dbPath: dbFile,
      dbExists,
      dbSizeBytes,
      userCount,
    },
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
      playbackGuard: true,
    },
    email: config.isEmailConfigured(),
    build: {
      gitSha: process.env.GIT_SHA ?? 'unknown',
    },
    auth: {
      jwtExpiresIn: resolveJwtExpiresIn(),
    },
    billing: {
      requireSubscription: config.requireSubscription,
      paytrConfigured: config.isPaytrConfigured(),
      paymentReady: config.isPaymentConfigured(),
      comingSoon: getSiteMode().enabled,
    },
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
      `${contentWithMetaSql} WHERE ${PUBLISHED_CONTENT_SQL_C} AND ${STANDARD_PROGRAM_SQL_C} AND ${MAIN_CATALOG_SQL_C} ORDER BY c.title`,
    ).map(mapContent)
    const studentCinemaCatalog = dbAll<ContentRow & { school_name: string | null; creator_name: string | null }>(
      `${contentWithMetaSql}
       WHERE ${PUBLISHED_CONTENT_SQL_C}
         AND c.program = 'student_cinema'
         AND ${MAIN_CATALOG_SQL_C}
       ORDER BY c.title`,
    ).map(mapContent)
    const featured =
      catalog.find((item) => item.featured) ??
      catalog[0] ??
      null
    const trailers = catalog
      .filter((item) => item.trailerUrl)
      .slice(0, 6)
    const newReleases = catalog
      .filter((item) => item.isNew)
      .slice(0, 12)

    let landing
    try {
      landing = getLandingConfig()
    } catch {
      landing = {
        slider: [],
        sliderContentIds: [],
        showcases: [],
        hero: undefined,
        sections: undefined,
        layout: undefined,
        customBlocks: [],
        monthlyWinnerContentIds: [],
        monthlyWinners: [],
        studentPickContentIds: [],
        studentPicks: [],
      }
    }

    const studentCinemaPicks =
      landing.studentPicks.length > 0 ? landing.studentPicks : fetchStudentCinemaPicksFallback()

    const studentCinemaMonthlyWinners =
      landing.monthlyWinners.length > 0
        ? landing.monthlyWinners
        : fetchStudentCinemaMonthlyWinnersFallback()

    const categories = mapCategoriesResponse()
    const categoryOrder = getCategoryOrderForBrowse()

    res.json({
      catalog,
      categories,
      categoryOrder,
      featuredContent: featured,
      trailers,
      newReleases,
      studentCinemaPicks,
      studentCinemaCatalog,
      studentCinemaMonthlyWinners,
      siteNav: mapSiteNavResponse(),
      landing,
      cekimNotlari: {
        title: 'Çekim İçin Notlar',
        sections: listCekimNotlariSections(),
      },
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
app.use('/api/legal', legalRoutes)
app.use('/api/admin/legal', adminLegalRoutes)
app.use('/api/journal', journalRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/episodes', episodeRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/watch-progress', watchProgressRoutes)
app.use('/api/playback', playbackRoutes)
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
app.use('/api/admin/site-mode', adminSiteModeRoutes)
app.use('/api/site-mode', siteModeRoutes)
app.use('/api/admin/billing-plans', adminBillingPlansRoutes)
app.use('/api/admin/upload', uploadRoutes)
app.use(seoRoutes)

if (config.webDistDir) {
  const distPath = path.resolve(config.webDistDir)
  const indexPath = path.join(distPath, 'index.html')
  const indexHtmlRaw = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : ''
  const buildId = process.env.GIT_SHA || 'dev'
  const bootScript =
    `<script>window.__PLOOY_API_BASE__='';window.__PLOOY_BUILD__='${buildId}';` +
    `(function(){try{var key='plooy-build',next=window.__PLOOY_BUILD__,prev=localStorage.getItem(key);` +
    `if(prev&&prev!==next){localStorage.setItem(key,next);var done=function(){location.reload()};` +
    `var wipeCaches=function(){if(!window.caches){done();return}` +
    `caches.keys().then(function(names){return Promise.all(names.map(function(name){return caches.delete(name)}))}).then(done)};` +
    `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations()` +
    `.then(function(regs){return Promise.all(regs.map(function(reg){return reg.unregister()}))}).then(wipeCaches)}` +
    `else wipeCaches()}else if(!prev){localStorage.setItem(key,next)}}catch(e){}})();</script>`

  const indexHtml = indexHtmlRaw.includes('__PLOOY_BUILD__')
    ? indexHtmlRaw.replace('__PLOOY_BUILD__', buildId)
    : indexHtmlRaw.includes('__PLOOY_API_BASE__') || indexHtmlRaw.includes('__SINEODA_API_BASE__')
      ? indexHtmlRaw.replace(
          '<head>',
          `<head>${bootScript}`,
        )
      : indexHtmlRaw.replace('<head>', `<head>${bootScript}`)

  const assetsPath = path.join(distPath, 'assets')
  if (fs.existsSync(assetsPath)) {
    app.use(
      '/assets',
      express.static(assetsPath, {
        immutable: true,
        maxAge: '365d',
      }),
    )
    // Eski deploy hash'leri 500 JSON yerine 404 — tarayıcı script hatası / siyah ekranı önler
    app.use('/assets', (_req, res) => {
      res.status(404).type('text/plain').send('Not found')
    })
  }

  app.use(
    express.static(distPath, {
      index: false,
      maxAge: '7d',
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        }
      },
    }),
  )

  app.get(/^(?!\/api\/|\/uploads\/|\/assets\/).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    if (indexHtml) {
      res.type('html').send(indexHtml)
      return
    }
    res.sendFile(indexPath)
  })
  console.log(`Web UI: ${distPath} (build ${buildId})`)
}

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message || 'Sunucu hatası.' })
})

app.listen(config.port, () => {
  console.log(`${BRAND_NAME} API http://localhost:${config.port}`)
  console.log(`Uploads: ${uploadsDir}`)
  console.log(`Database: ${path.join(config.dataDir, 'sineoda.db')}`)
  console.log(`Frontend: ${config.frontendUrl}`)
  console.log(`Email: ${config.isEmailConfigured() ? 'configured' : 'dev mode (console log)'}`)
  if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'sineoda-dev-secret-change-in-production') {
    console.warn('[auth] UYARI: JWT_SECRET varsayılan değerde — .env içinde güçlü bir secret tanımlayın.')
  }
  const jwtExpiresIn = resolveJwtExpiresIn()
  console.log(`[auth] JWT süresi: ${jwtExpiresIn} (env JWT_EXPIRES_IN yok sayılır)`)

  try {
    ensureMonthlyRollover()
    seedDemoMonthlyIfEmpty()
  } catch (error) {
    console.error('[watch-accounting] startup init failed:', error)
  }
})
