import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../db.js'
import { mapContent } from '../mappers.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
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
import type { ContentRow } from '../types.js'

const router = Router()

export function getLandingConfig() {
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

  const sliderContentIds = sliderRows.map((row) => row.content_id)

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
  const layout = getLandingLayoutConfig()

  return { slider, sliderContentIds, showcases, hero, sections, layout }
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

router.patch('/hero', requireAdmin, (req: AuthRequest, res) => {
  const hero = saveLandingHeroConfig(validateHeroPayload(req.body))
  res.json({ hero })
})

router.patch('/sections', requireAdmin, (req: AuthRequest, res) => {
  const sections = saveLandingSectionsConfig(req.body as Partial<LandingSectionsConfig>)
  res.json({ sections })
})

router.patch('/layout', requireAdmin, (req: AuthRequest, res) => {
  const layout = saveLandingLayoutConfig(req.body as Partial<LandingLayoutConfig>)
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
  }

  if (body.hero) {
    saveLandingHeroConfig(validateHeroPayload(body.hero))
  }
  if (body.sections) {
    saveLandingSectionsConfig(body.sections)
  }
  if (body.layout) {
    saveLandingLayoutConfig(body.layout)
  }

  const sliderIds = Array.isArray(body.sliderIds) ? body.sliderIds.map(String) : null
  const showcases = Array.isArray(body.showcases) ? body.showcases : null

  if (sliderIds && showcases) {
    dbRun('DELETE FROM landing_slider')
    sliderIds.forEach((contentId: string, index: number) => {
      dbRun('INSERT INTO landing_slider (content_id, sort_order) VALUES (?, ?)', [
        contentId,
        index,
      ])
    })

    dbRun('DELETE FROM landing_showcase_items')
    dbRun('DELETE FROM landing_showcases')

    showcases.forEach(
      (
        showcase: {
          id: string
          title: string
          icon?: string
          description?: string
          itemIds?: string[]
        },
        index: number,
      ) => {
        const id = String(showcase.id ?? '').trim()
        const title = String(showcase.title ?? '').trim()
        if (!id || !title) return

        dbRun(
          'INSERT INTO landing_showcases (id, title, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)',
          [
            id,
            title,
            String(showcase.icon ?? 'film'),
            String(showcase.description ?? ''),
            index,
          ],
        )

        ;(showcase.itemIds ?? []).forEach((contentId: string, itemIndex: number) => {
          dbRun(
            'INSERT INTO landing_showcase_items (showcase_id, content_id, sort_order) VALUES (?, ?, ?)',
            [id, contentId, itemIndex],
          )
        })
      },
    )
  } else if (!body.hero && !body.sections && !body.layout) {
    res.status(400).json({ error: 'Kaydedilecek ana sayfa verisi bulunamadı.' })
    return
  }

  res.json(getLandingConfig())
})

export default router
