import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../db.js'
import { mapContent } from '../mappers.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import {
  getLandingCustomBlocks,
  saveLandingCustomBlocks,
  type LandingCustomBlock,
} from '../services/landingCustomBlocks.js'
import {
  getLandingHeroConfig,
  parseLandingHero,
  saveLandingHeroConfig,
  type LandingHeroConfig,
} from '../services/landingHero.js'
import {
  getLandingLayoutConfig,
  saveLandingLayoutConfig,
  type LandingLayoutConfig,
} from '../services/landingLayout.js'
import {
  getLandingSectionsConfig,
  parseLandingSections,
  saveLandingSectionsConfig,
  type LandingSectionsConfig,
} from '../services/landingSections.js'
import { filterContentIdsForPool, poolForShowcaseIcon } from '../services/contentPools.js'
import {
  fetchStudentCinemaMonthlyWinnersFallback,
  fetchStudentCinemaPicksFallback,
} from '../services/landingStudentRows.js'
import {
  resolveLandingFeaturedItem,
  syncFeaturedFromHero,
} from '../services/landingFeatured.js'
import {
  getLandingBlockTitlesConfig,
  saveLandingBlockTitlesConfig,
} from '../services/landingBlockTitles.js'
import type { ContentRow } from '../types.js'

const router = Router()

export function getLandingConfig() {
  const customBlocks = getLandingCustomBlocks()
  const customBlockIds = customBlocks.map((block) => block.id)

  const sliderRows = dbAll<{ content_id: string; sort_order: number }>(
    'SELECT content_id, sort_order FROM landing_slider ORDER BY sort_order',
  )
  const showcaseRows = dbAll<{
    id: string
    title: string
    icon: string
    description: string
    sort_order: number
  }>('SELECT * FROM landing_showcases ORDER BY sort_order, title')

  const itemRows = dbAll<{ showcase_id: string; content_id: string; sort_order: number }>(
    'SELECT showcase_id, content_id, sort_order FROM landing_showcase_items ORDER BY sort_order',
  )

  const catalog = dbAll<ContentRow>('SELECT * FROM content')
  const catalogMap = new Map(catalog.map((row) => [row.id, mapContent(row)]))
  const validContentIds = new Set(catalog.map((row) => row.id))

  const sliderContentIds = sliderRows
    .map((row) => row.content_id)
    .filter((contentId) => validContentIds.has(contentId))

  const slider = sliderContentIds
    .map((contentId) => catalogMap.get(contentId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  const showcases = showcaseRows.map((showcase) => ({
    id: showcase.id,
    title: showcase.title,
    icon: showcase.icon,
    description: showcase.description,
    items: itemRows
      .filter((item) => item.showcase_id === showcase.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => catalogMap.get(item.content_id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  }))

  const hero = getLandingHeroConfig()
  const sections = getLandingSectionsConfig()
  const layout = getLandingLayoutConfig(customBlockIds)
  const blockTitles = getLandingBlockTitlesConfig()
  const featuredItem = resolveLandingFeaturedItem(hero, catalog)

  const monthlyWinnerRows = dbAll<{ content_id: string; sort_order: number }>(
    'SELECT content_id, sort_order FROM landing_monthly_winners ORDER BY sort_order',
  )
  const monthlyWinnerContentIds = monthlyWinnerRows
    .map((row) => row.content_id)
    .filter((contentId) => validContentIds.has(contentId))
  let monthlyWinners = monthlyWinnerContentIds
    .map((contentId) => catalogMap.get(contentId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  if (monthlyWinners.length === 0) {
    monthlyWinners = fetchStudentCinemaMonthlyWinnersFallback()
  }

  const studentPickRows = dbAll<{ content_id: string; sort_order: number }>(
    'SELECT content_id, sort_order FROM landing_student_picks ORDER BY sort_order',
  )
  const studentPickContentIds = studentPickRows
    .map((row) => row.content_id)
    .filter((contentId) => validContentIds.has(contentId))
  let studentPicks = studentPickContentIds
    .map((contentId) => catalogMap.get(contentId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  if (studentPicks.length === 0) {
    studentPicks = fetchStudentCinemaPicksFallback()
  }

  // Birinciler seçkide tekrar etmesin
  if (monthlyWinners.length > 0) {
    const winnerIds = new Set(monthlyWinners.map((item) => item.id))
    studentPicks = studentPicks.filter((item) => !winnerIds.has(item.id))
  }

  return {
    slider,
    sliderContentIds,
    showcases,
    hero,
    featuredItem,
    sections,
    layout,
    customBlocks,
    monthlyWinnerContentIds,
    monthlyWinners,
    studentPickContentIds,
    studentPicks,
    blockTitles,
  }
}

function contentExists(contentId: string | null) {
  if (!contentId) return true
  const row = dbGet<{ id: string }>('SELECT id FROM content WHERE id = ?', [contentId])
  return Boolean(row)
}

function validateHeroPayload(raw: unknown): LandingHeroConfig {
  const hero = parseLandingHero(raw as Partial<LandingHeroConfig>)
  if (hero.backgroundContentId && !contentExists(hero.backgroundContentId)) {
    hero.backgroundContentId = null
  }
  if (hero.featuredContentId && !contentExists(hero.featuredContentId)) {
    hero.featuredContentId = null
  }
  return hero
}

function sanitizeLayout(raw: Partial<LandingLayoutConfig> | undefined, customBlockIds: string[]) {
  if (!raw) return undefined
  const incomingCustomIds = (raw.order ?? [])
    .filter((id): id is string => typeof id === 'string' && id.startsWith('custom:'))
    .map((id) => id.slice('custom:'.length))
  const allCustomIds = [...new Set([...customBlockIds, ...incomingCustomIds])]
  const validIds = new Set([
    ...allCustomIds.map((id) => `custom:${id}`),
    'hero',
    'manifesto',
    'slider',
    'studentMonthlyWinners',
    'studentPicks',
    'showcases',
    'journal',
    'features',
    'campaign',
    'studentCinema',
    'faq',
    'emailSignup',
    'creator',
  ])
  return {
    order: (raw.order ?? []).filter((id) => validIds.has(id)),
    hidden: (raw.hidden ?? []).filter((id) => validIds.has(id)),
  }
}

router.patch('/hero', requireAdmin, (req: AuthRequest, res) => {
  const hero = saveLandingHeroConfig(validateHeroPayload(req.body))
  syncFeaturedFromHero(hero)
  res.json({ hero })
})

router.patch('/sections', requireAdmin, (req: AuthRequest, res) => {
  const sections = saveLandingSectionsConfig(req.body as Partial<LandingSectionsConfig>)
  res.json({ sections })
})

router.patch('/layout', requireAdmin, (req: AuthRequest, res) => {
  const body = req.body as Partial<LandingLayoutConfig> & { customBlockIds?: unknown }
  const pendingIds = Array.isArray(body.customBlockIds)
    ? body.customBlockIds.map((id) => String(id))
    : []
  const dbCustomIds = getLandingCustomBlocks().map((block) => block.id)
  const customBlockIds = [...new Set([...dbCustomIds, ...pendingIds])]
  const layoutPayload: Partial<LandingLayoutConfig> = {
    order: body.order,
    hidden: body.hidden,
  }
  const layout = saveLandingLayoutConfig(
    sanitizeLayout(layoutPayload, customBlockIds),
    customBlockIds,
  )
  res.json({ layout })
})

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(getLandingConfig())
})

router.put('/', requireAdmin, (req: AuthRequest, res) => {
  const body = req.body as {
    hero?: Partial<LandingHeroConfig>
    sections?: Partial<LandingSectionsConfig>
    layout?: Partial<LandingLayoutConfig>
    sliderIds?: unknown
    showcases?: unknown
    customBlocks?: unknown
    monthlyWinnerIds?: unknown
    studentPickIds?: unknown
    blockTitles?: unknown
  }

  let customBlocks: LandingCustomBlock[] | null = null
  if (Array.isArray(body.customBlocks)) {
    customBlocks = saveLandingCustomBlocks(body.customBlocks as LandingCustomBlock[])
  } else {
    customBlocks = getLandingCustomBlocks()
  }
  const customBlockIds = customBlocks.map((block) => block.id)

  if (body.hero) {
    const hero = saveLandingHeroConfig(validateHeroPayload(body.hero))
    syncFeaturedFromHero(hero)
  }
  if (body.sections) {
    saveLandingSectionsConfig(body.sections)
  }
  if (body.blockTitles) {
    saveLandingBlockTitlesConfig(body.blockTitles as Record<string, string>)
  }
  if (body.layout) {
    saveLandingLayoutConfig(sanitizeLayout(body.layout, customBlockIds), customBlockIds)
  }

  const sliderIds = Array.isArray(body.sliderIds) ? body.sliderIds.map(String) : null
  const showcases = Array.isArray(body.showcases) ? body.showcases : null
  const monthlyWinnerIds = Array.isArray(body.monthlyWinnerIds)
    ? body.monthlyWinnerIds.map(String)
    : null
  const studentPickIds = Array.isArray(body.studentPickIds)
    ? body.studentPickIds.map(String)
    : null
  const catalogIds = new Set(dbAll<{ id: string }>('SELECT id FROM content').map((row) => row.id))

  if (monthlyWinnerIds) {
    dbRun('DELETE FROM landing_monthly_winners')
    monthlyWinnerIds
      .filter((contentId) => catalogIds.has(contentId))
      .forEach((contentId: string, index: number) => {
        dbRun('INSERT INTO landing_monthly_winners (content_id, sort_order) VALUES (?, ?)', [
          contentId,
          index,
        ])
      })
  }

  if (studentPickIds) {
    dbRun('DELETE FROM landing_student_picks')
    studentPickIds
      .filter((contentId) => catalogIds.has(contentId))
      .forEach((contentId: string, index: number) => {
        dbRun('INSERT INTO landing_student_picks (content_id, sort_order) VALUES (?, ?)', [
          contentId,
          index,
        ])
      })
  }

  if (sliderIds) {
    dbRun('DELETE FROM landing_slider')
    sliderIds
      .filter((contentId) => catalogIds.has(contentId))
      .forEach((contentId: string, index: number) => {
        dbRun('INSERT INTO landing_slider (content_id, sort_order) VALUES (?, ?)', [contentId, index])
      })
  }

  if (showcases) {
    const normalizedShowcases = showcases
      .map(
        (
          showcase: {
            id: string
            title: string
            icon?: string
            description?: string
            itemIds?: string[]
          },
          index: number,
        ) => ({
          id: String(showcase.id ?? '').trim(),
          title: String(showcase.title ?? '').trim(),
          icon: String(showcase.icon ?? 'film'),
          description: String(showcase.description ?? ''),
          itemIds: Array.isArray(showcase.itemIds) ? showcase.itemIds.map(String) : [],
          sortOrder: index,
        }),
      )
      .filter((showcase) => showcase.id && showcase.title)

    if (normalizedShowcases.length !== showcases.length) {
      res.status(400).json({ error: 'Her kategori şeridinin başlığı dolu olmalı.' })
      return
    }

    dbRun('DELETE FROM landing_showcase_items')
    dbRun('DELETE FROM landing_showcases')

    normalizedShowcases.forEach((showcase) => {
      dbRun(
        'INSERT INTO landing_showcases (id, title, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)',
        [showcase.id, showcase.title, showcase.icon, showcase.description, showcase.sortOrder],
      )

      ;(filterContentIdsForPool(
        poolForShowcaseIcon(showcase.icon),
        showcase.itemIds.filter((contentId) => catalogIds.has(contentId)),
      ) as string[]).forEach((contentId: string, itemIndex: number) => {
        dbRun(
          'INSERT INTO landing_showcase_items (showcase_id, content_id, sort_order) VALUES (?, ?, ?)',
          [showcase.id, contentId, itemIndex],
        )
      })
    })
  }

  try {
    res.json(getLandingConfig())
  } catch (err) {
    console.error('[landing] PUT kayit sonrasi okuma hatasi:', err)
    res.status(500).json({ error: 'Kaydedildi ancak yanit olusturulamadi. Sayfayi yenileyin.' })
  }
})

export default router
