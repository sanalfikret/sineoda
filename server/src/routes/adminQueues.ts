import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { dbAll } from '../db.js'
import { getContentEngagementStats } from '../services/studentCinema.js'
const router = Router()
router.get('/', requireAdmin, (req, res) => {
  const status = String(req.query.status ?? 'pending')
  if (!['new_creator','new_student','pending','under_review','on_hold','approved','rejected','published'].includes(status)) { res.sendStatus(400); return }
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const counts = Object.fromEntries(dbAll<{ status: string; total: number }>('SELECT review_status AS status, COUNT(*) AS total FROM content WHERE creator_id IS NOT NULL GROUP BY review_status').map(r => [r.status, r.total]))
  for (const [key, program] of [['new_creator','standard'],['new_student','student_cinema']]) counts[key] = dbAll<{ id: string }>("SELECT id FROM creators WHERE status = 'pending' AND COALESCE(program, 'standard') = ?", [program]).length
  if (status.startsWith('new_')) {
    const items = dbAll("SELECT id, studio_name AS title, program, status, registration_paid_at AS paidAt FROM creators WHERE status = 'pending' AND COALESCE(program, 'standard') = ? ORDER BY created_at LIMIT 50 OFFSET ?", [status === 'new_student' ? 'student_cinema' : 'standard', offset])
    res.json({ counts, items }); return
  }
  const items = dbAll<{ id: string; title: string; program: string; status: string }>('SELECT id, title, program, review_status AS status FROM content WHERE creator_id IS NOT NULL AND review_status = ? ORDER BY content_added_at LIMIT 50 OFFSET ?', [status, offset])
  const stats = getContentEngagementStats(items.map(r => r.id))
  res.json({ counts, items: items.map(r => ({ ...r, ...stats.get(r.id) })) })
})
export default router
