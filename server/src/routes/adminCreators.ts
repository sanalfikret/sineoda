import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { mapContent, mapContentAdmin } from '../mappers.js'
import { addToGencSinemaCategory, isStudentMainRow } from '../services/studentCinema.js'
import {
  applyCreatorReviewStatus,
  resolveCreatorPublishUpdate,
  updateCreatorContentFields,
} from '../services/creatorContentAdmin.js'
import { attachStats, getContentEngagementStats } from '../services/studentCinema.js'
import type { ContentRow, CreatorRow } from '../types.js'

const router = Router()

function mapCreatorContentItem(row: ContentRow, stats?: ReturnType<typeof getContentEngagementStats> extends Map<string, infer V> ? V : never) {
  return {
    ...mapContentAdmin(row),
    reviewStatus: row.review_status ?? 'pending',
    creatorId: row.creator_id ?? null,
    ...(stats ?? {
      qualifiedMinutes: 0,
      watchMinutes: 0,
      watchCount: 0,
      likes: 0,
      viewers: 0,
    }),
  }
}

function getStandardCreatorContent(contentId: string) {
  return dbGet<ContentRow>(
    `SELECT * FROM content
     WHERE id = ? AND creator_id IS NOT NULL AND program = 'standard'`,
    [contentId],
  )
}

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

router.get('/creators/:id', requireAdmin, (req: AuthRequest, res) => {
  const row = dbGet<
    CreatorRow & { user_name: string; user_email: string; user_created_at: string }
  >(
    `SELECT c.*, u.name AS user_name, u.email AS user_email, u.created_at AS user_created_at
     FROM creators c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ?`,
    [req.params.id],
  )

  if (!row) {
    res.status(404).json({ error: 'Yapımcı bulunamadı.' })
    return
  }

  const documents = dbAll<{
    id: string
    doc_type: string
    file_url: string
    uploaded_at: string
  }>('SELECT id, doc_type, file_url, uploaded_at FROM creator_documents WHERE creator_id = ? ORDER BY uploaded_at DESC', [
    row.id,
  ])

  const contentRows = dbAll<ContentRow>(
    'SELECT * FROM content WHERE creator_id = ? ORDER BY content_added_at DESC',
    [row.id],
  )

  const stats = getContentEngagementStats(contentRows.map((item) => item.id))

  res.json({
    creator: {
      id: row.id,
      userId: row.user_id,
      name: row.user_name,
      email: row.user_email,
      studioName: row.studio_name,
      bio: row.bio,
      status: row.status,
      legalAcceptedAt: row.legal_accepted_at,
      createdAt: row.created_at,
      userCreatedAt: row.user_created_at,
      documentCount: documents.length,
      contentCount: contentRows.length,
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      docType: doc.doc_type,
      fileUrl: doc.file_url,
      uploadedAt: doc.uploaded_at,
    })),
    content: attachStats(
      contentRows.map((item) => ({
        ...mapContentAdmin(item),
        reviewStatus: item.review_status ?? 'pending',
      })),
      stats,
    ),
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
  const rows = dbAll<ContentRow & { studio_name: string; creator_name: string }>(
    `SELECT c.*, cr.studio_name, u.name AS creator_name
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     LEFT JOIN users u ON u.id = cr.user_id
     WHERE c.review_status = 'pending' AND c.program = 'standard' AND c.creator_id IS NOT NULL
     ORDER BY c.content_added_at DESC`,
  )

  res.json({
    items: rows.map((row) => ({
      ...mapContent(row),
      reviewStatus: row.review_status,
      studioName: row.studio_name,
      creatorName: row.creator_name,
    })),
  })
})

router.get('/content/:id', requireAdmin, (req: AuthRequest, res) => {
  const row = dbGet<
    ContentRow & { studio_name: string | null; creator_name: string | null; creator_email: string | null }
  >(
    `SELECT c.*, cr.studio_name, u.name AS creator_name, u.email AS creator_email
     FROM content c
     LEFT JOIN creators cr ON cr.id = c.creator_id
     LEFT JOIN users u ON u.id = cr.user_id
     WHERE c.id = ? AND c.creator_id IS NOT NULL AND c.program = 'standard'`,
    [req.params.id],
  )

  if (!row) {
    res.status(404).json({ error: 'Yapımcı filmi bulunamadı.' })
    return
  }

  const stats = getContentEngagementStats([row.id]).get(row.id)

  res.json({
    item: {
      ...mapCreatorContentItem(row, stats),
      studioName: row.studio_name,
      creatorName: row.creator_name,
      creatorEmail: row.creator_email,
    },
  })
})

router.patch('/content/:id', requireAdmin, (req: AuthRequest, res) => {
  const existing = getStandardCreatorContent(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Yapımcı filmi bulunamadı.' })
    return
  }

  const body = req.body as Record<string, unknown>
  const reviewStatus =
    body.reviewStatus !== undefined || body.review_status !== undefined
      ? String(body.reviewStatus ?? body.review_status).trim()
      : existing.review_status ?? 'pending'

  if (body.reviewStatus !== undefined || body.review_status !== undefined) {
    if (!['published', 'rejected', 'pending'].includes(reviewStatus)) {
      res.status(400).json({ error: 'Geçersiz inceleme durumu.' })
      return
    }
  }

  try {
    updateCreatorContentFields(existing, body)
    resolveCreatorPublishUpdate(existing, body, reviewStatus)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Film güncellenemedi.' })
    return
  }

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  const stats = getContentEngagementStats([row.id]).get(row.id)

  res.json({ item: mapCreatorContentItem(row, stats) })
})

router.patch('/content/:id/review', requireAdmin, (req: AuthRequest, res) => {
  const reviewStatus = String(req.body.reviewStatus ?? req.body.status ?? '').trim()
  if (!['published', 'rejected', 'pending'].includes(reviewStatus)) {
    res.status(400).json({ error: 'Geçersiz inceleme durumu.' })
    return
  }

  const existing = getStandardCreatorContent(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Yapımcı filmi bulunamadı.' })
    return
  }

  try {
    if (req.body.publishedAt !== undefined || req.body.publishNow === true) {
      resolveCreatorPublishUpdate(existing, req.body as Record<string, unknown>, reviewStatus)
    } else {
      applyCreatorReviewStatus(existing, reviewStatus)
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'İnceleme güncellenemedi.' })
    return
  }

  if (reviewStatus === 'published' && isStudentMainRow(existing)) {
    addToGencSinemaCategory(existing.id)
  }

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  res.json({ item: mapContent(row), reviewStatus: row.review_status })
})

export default router
