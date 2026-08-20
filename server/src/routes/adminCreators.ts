import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapContent } from '../mappers.js'
import type { ContentRow, CreatorRow } from '../types.js'

const router = Router()

router.get('/creators', requireAdmin, (_req: AuthRequest, res) => {
  const rows = dbAll<
    CreatorRow & { user_name: string; user_email: string; document_count: number; content_count: number }
  >(
    `SELECT c.*, u.name AS user_name, u.email AS user_email,
      (SELECT COUNT(*) FROM creator_documents cd WHERE cd.creator_id = c.id) AS document_count,
      (SELECT COUNT(*) FROM content co WHERE co.creator_id = c.id) AS content_count
    FROM creators c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC`,
  )

  res.json({
    creators: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.user_name,
      email: row.user_email,
      studioName: row.studio_name,
      bio: row.bio,
      status: row.status,
      legalAcceptedAt: row.legal_accepted_at,
      createdAt: row.created_at,
      documentCount: row.document_count,
      contentCount: row.content_count,
    })),
  })
})

router.patch('/creators/:id', requireAdmin, (req: AuthRequest, res) => {
  const status = String(req.body.status ?? '').trim()
  if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
    res.status(400).json({ error: 'Geçersiz durum.' })
    return
  }

  const creator = dbGet<CreatorRow>('SELECT * FROM creators WHERE id = ?', [req.params.id])
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı bulunamadı.' })
    return
  }

  dbRun('UPDATE creators SET status = ? WHERE id = ?', [status, creator.id])
  res.json({ ok: true, status })
})

router.get('/content/pending', requireAdmin, (_req: AuthRequest, res) => {
  const rows = dbAll<ContentRow & { studio_name: string }>(
    `SELECT c.*, cr.studio_name
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     WHERE c.review_status = 'pending'
     ORDER BY c.content_added_at DESC`,
  )

  res.json({
    items: rows.map((row) => ({
      ...mapContent(row),
      reviewStatus: row.review_status,
      studioName: row.studio_name,
    })),
  })
})

router.patch('/content/:id/review', requireAdmin, (req: AuthRequest, res) => {
  const reviewStatus = String(req.body.reviewStatus ?? req.body.status ?? '').trim()
  if (!['published', 'rejected', 'pending'].includes(reviewStatus)) {
    res.status(400).json({ error: 'Geçersiz inceleme durumu.' })
    return
  }

  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }

  const publishedAt =
    reviewStatus === 'published'
      ? existing.published_at ?? new Date().toISOString()
      : reviewStatus === 'rejected'
        ? null
        : existing.published_at

  dbRun('UPDATE content SET review_status = ?, published_at = ? WHERE id = ?', [
    reviewStatus,
    publishedAt,
    existing.id,
  ])

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  res.json({ item: mapContent(row), reviewStatus })
})

export default router
