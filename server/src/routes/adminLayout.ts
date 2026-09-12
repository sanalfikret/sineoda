import { Router } from 'express'
import { dbGet, dbRun } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

/**
 * Admin panel kutu düzeni: sürükle-bırak sırası, kutu genişliği (sütun sayısı) ve
 * tablo/detay bölme oranı. Tek admin çalıştığı için site geneli saklanır; her cihazda aynı düzen açılır.
 */
const SETTINGS_KEY = 'admin_layouts'
const KEY_RE = /^[a-z0-9-]{1,60}$/
const MAX_ITEMS = 60

interface GridLayout {
  order: string[]
  spans: Record<string, number>
  split?: number
}

type LayoutMap = Record<string, GridLayout>

function readAll(): LayoutMap {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) return {}
  try {
    const parsed = JSON.parse(row.value)
    return parsed && typeof parsed === 'object' ? (parsed as LayoutMap) : {}
  } catch {
    return {}
  }
}

function writeAll(map: LayoutMap) {
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [SETTINGS_KEY, JSON.stringify(map)])
}

function parseLayout(input: unknown): GridLayout {
  if (!input || typeof input !== 'object') throw new Error('Geçersiz düzen.')
  const raw = input as Record<string, unknown>
  const order = Array.isArray(raw.order) ? raw.order : []
  if (order.length > MAX_ITEMS || order.some((id) => typeof id !== 'string' || !KEY_RE.test(id))) throw new Error('Geçersiz sıra.')
  const spans: Record<string, number> = {}
  if (raw.spans && typeof raw.spans === 'object') {
    for (const [id, value] of Object.entries(raw.spans as Record<string, unknown>)) {
      const span = Number(value)
      if (!KEY_RE.test(id) || !Number.isInteger(span) || span < 1 || span > 6) throw new Error('Geçersiz genişlik.')
      spans[id] = span
    }
  }
  if (Object.keys(spans).length > MAX_ITEMS) throw new Error('Geçersiz genişlik.')
  const layout: GridLayout = { order: order as string[], spans }
  if (raw.split !== undefined && raw.split !== null) {
    const split = Number(raw.split)
    if (!Number.isFinite(split) || split < 0.2 || split > 0.85) throw new Error('Geçersiz bölme oranı.')
    layout.split = Math.round(split * 1000) / 1000
  }
  return layout
}

const router = Router()
router.use(requireAdmin)

router.get('/', (_req, res) => {
  res.json({ layouts: readAll() })
})

/** Gövde: { layout: GridLayout } kaydeder, { layout: null } varsayılana döndürür. */
router.put('/:key', (req, res) => {
  const key = String(req.params.key)
  if (!KEY_RE.test(key)) {
    res.status(400).json({ error: 'Geçersiz düzen anahtarı.' })
    return
  }
  try {
    const map = readAll()
    const body = (req.body ?? {}) as { layout?: unknown }
    if (body.layout === null) delete map[key]
    else map[key] = parseLayout(body.layout)
    writeAll(map)
    res.json({ layouts: map })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Düzen kaydedilemedi.' })
  }
})

export default router
