import { Router } from 'express'
import { dbAll, dbRun } from '../db.js'
import { mapContent } from '../mappers.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
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

  const slider = sliderRows
    .map((row) => catalogMap.get(row.content_id))
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

  return { slider, showcases }
}

router.get('/', (_req, res) => {
  res.json(getLandingConfig())
})

router.put('/', requireAdmin, (req: AuthRequest, res) => {
  const sliderIds = Array.isArray(req.body.sliderIds)
    ? req.body.sliderIds.map(String)
    : null
  const showcases = Array.isArray(req.body.showcases) ? req.body.showcases : null

  if (!sliderIds || !showcases) {
    res.status(400).json({ error: 'sliderIds ve showcases zorunlu.' })
    return
  }

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

  res.json(getLandingConfig())
})

export default router
