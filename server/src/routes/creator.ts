import { getLegalVersion } from '../services/legalDocuments.js'
import { recordLegalConsent } from '../services/legalConsent.js'
import { getClientIp, getUserAgent } from '../utils/clientIp.js'
import { externalMediaLink } from '../services/creatorMedia.js'
import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { BRAND_NAME } from '../constants/brand.js'
import { dbAll, dbGet, dbRun, dbTransaction } from '../db.js'
import {
  getCreatorForUser,
  requireAuth,
  requireActiveCreator,
  requireApprovedCreator,
  requireCreator,
  type AuthRequest,
} from '../middleware/auth.js'
import { mapContent, serializeSubtitles, slugify } from '../mappers.js'
import { normalizeContentType } from '../constants/contentTypes.js'
import { parseContentAddedAt } from '../services/license.js'
import { serializeCredits, validateApplicationCredits } from '../services/credits.js'
import { parseFestivalsBody, serializeFestivals } from '../services/festivals.js'
import { resolveDurationFields } from '../services/duration.js'
import {
  creatorHasBaseDocuments,
  linkApplicationDocuments,
  saveApplicationDeclaration,
  validateFilmApplication,
} from '../services/filmApplication.js'
import { getContentEngagementStats } from '../services/studentCinema.js'
import { getAccountingReport, listNewAccountingMonths } from '../services/accountingLedger.js'
import { getMonthlyReport, monthKey } from '../services/watchAccounting.js'
import { isCreatorRegistrationPaid, getCreatorRegistrationStatus } from '../services/creatorRegistration.js'
import { findStudentMainStub } from '../services/studentFilmSubmission.js'
import { resolveStreamProvider } from '../services/streamProvider.js'
import {
  countUnreadMessages,
  listUserMessages,
  markMessageRead,
} from '../services/userMessages.js'
import type { ContentRow, CreatorRow, UserRow } from '../types.js'

const router = Router()

interface CreatorAuthRequest extends AuthRequest {
  creator?: CreatorRow
}

function getCreatorProfile(userId: string) {
  const user = dbGet('SELECT id, name, email, role FROM users WHERE id = ?', [userId])
  const creator = getCreatorForUser(userId)
  if (!user || !creator) return null

  const documents = dbAll<{
    id: string
    doc_type: string
    file_url: string
    uploaded_at: string
  }>('SELECT id, doc_type, file_url, uploaded_at FROM creator_documents WHERE creator_id = ? ORDER BY uploaded_at DESC', [
    creator.id,
  ])

  return {
    user,
    creator: {
      id: creator.id,
      studioName: creator.studio_name,
      bio: creator.bio,
      status: creator.status,
      legalAcceptedAt: creator.legal_accepted_at,
      createdAt: creator.created_at,
      program: creator.program ?? 'standard',
      schoolId: creator.school_id ?? null,
      registrationPaidAt: creator.registration_paid_at ?? null,
      registrationPaid: getCreatorRegistrationStatus(creator.user_id).paid,
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      docType: doc.doc_type,
      fileUrl: doc.file_url,
      uploadedAt: doc.uploaded_at,
    })),
  }
}

router.get('/me', requireCreator, (req: AuthRequest, res) => {
  const profile = getCreatorProfile(req.auth!.userId)
  if (!profile) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }
  res.json(profile)
})

router.get('/dashboard', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const contentRows = dbAll<ContentRow>(
    'SELECT * FROM content WHERE creator_id = ? ORDER BY content_added_at DESC',
    [creator.id],
  )

  const engagementStats = getContentEngagementStats(contentRows.map((row) => row.id))
  const documents = dbAll<{ id: string }>('SELECT id FROM creator_documents WHERE creator_id = ?', [creator.id])

  res.json({
    creator: {
      id: creator.id,
      studioName: creator.studio_name,
      status: creator.status,
      documentCount: documents.length,
      program: creator.program ?? 'standard',
      schoolId: creator.school_id ?? null,
      registrationPaidAt: creator.registration_paid_at ?? null,
      registrationPaid: getCreatorRegistrationStatus(creator.user_id).paid,
    },
    payoutRules: {
      note: 'Kazançlar yapımcı anlaşmasında belirtilen adil paylaşım modeline göre hesaplanır.',
    },
    content: contentRows.map((row) => {
      const stat = engagementStats.get(row.id)
      return {
        ...mapContent(row),
        sourceVideoUrl: row.source_video_url ?? '',
        reviewStatus: row.review_status ?? 'pending',
        program: row.program ?? 'standard',
        contentFormat: row.content_format ?? 'main',
        parentContentId: row.parent_content_id ?? null,
        schoolReviewStatus: row.school_review_status ?? 'none',
        reviewNote: row.review_note ?? null,
        qualifiedMinutes: stat?.qualifiedMinutes ?? 0,
        watchMinutes: stat?.watchMinutes ?? 0,
        likes: stat?.likes ?? 0,
        viewers: stat?.viewers ?? 0,
      }
    }),
    totals: {
      qualifiedMinutes: [...engagementStats.values()].reduce((sum, row) => sum + row.qualifiedMinutes, 0),
      watchMinutes: [...engagementStats.values()].reduce((sum, row) => sum + row.watchMinutes, 0),
      likes: [...engagementStats.values()].reduce((sum, row) => sum + row.likes, 0),
      viewers: [...engagementStats.values()].reduce((sum, row) => sum + row.viewers, 0),
      publishedCount: contentRows.filter((row) => row.review_status === 'published').length,
      pendingCount: contentRows.filter((row) => row.review_status === 'pending').length,
      paymentPendingCount: contentRows.filter((row) => row.review_status === 'payment_pending').length,
    },
  })
})

router.post('/documents', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const docType = String(req.body.docType ?? 'ownership').trim()
  const fileUrl = String(req.body.fileUrl ?? '').trim()

  if (!fileUrl) {
    res.status(400).json({ error: 'Belge URL gerekli.' })
    return
  }

  const id = uuid()
  const now = new Date().toISOString()
  dbRun(
    'INSERT INTO creator_documents (id, creator_id, doc_type, file_url, uploaded_at) VALUES (?, ?, ?, ?, ?)',
    [id, creator.id, docType, fileUrl, now],
  )

  res.status(201).json({
    document: { id, docType, fileUrl, uploadedAt: now },
  })
})

router.delete('/documents/:id', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const doc = dbGet('SELECT id FROM creator_documents WHERE id = ? AND creator_id = ?', [
    req.params.id,
    creator.id,
  ])
  if (!doc) {
    res.status(404).json({ error: 'Belge bulunamadı.' })
    return
  }

  dbRun('DELETE FROM creator_documents WHERE id = ?', [req.params.id])
  res.status(204).send()
})

router.get('/content', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const rows = dbAll<ContentRow>('SELECT * FROM content WHERE creator_id = ? ORDER BY title', [creator.id])
  res.json({ items: rows.map(mapContent) })
})

router.post('/content', requireActiveCreator, (req: CreatorAuthRequest, res) => {
  const creator = req.creator!
  const body = req.body as Record<string, unknown>
  const user = dbGet<Pick<UserRow, 'subscription_expires_at'>>(
    'SELECT subscription_expires_at FROM users WHERE id = ?',
    [req.auth!.userId],
  )
  const registrationPaid = isCreatorRegistrationPaid(creator, user)

  const contentFormat = String(body.contentFormat ?? body.content_format ?? 'main').trim()
  const isMainApplication = contentFormat === 'main'
  const isStudentProgram = (creator.program ?? 'standard') === 'student_cinema'

  if (!registrationPaid) {
    res.status(402).json({
      error: 'Film başvurusu göndermek için başvuru ücretini ödemelisiniz.',
      code: 'CREATOR_PAYMENT_REQUIRED',
    })
    return
  }
  if (body.submissionTermsAccepted !== true || body.submissionTermsVersion !== getLegalVersion() || !['tr','en'].includes(String(body.submissionTermsLocale))) {
    res.status(409).json({error:'Güncel film gönderim şartnamesini okuyup kabul edin. / Please read and accept the current submission terms.',code:'SUBMISSION_TERMS_REQUIRED'}); return
  }
  let application: ReturnType<typeof validateFilmApplication> | null = null

  if (isMainApplication) {
    try {
      application = validateFilmApplication(body, creator.id)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Başvuru doğrulanamadı.' })
      return
    }
  } else if (!creatorHasBaseDocuments(creator.id)) {
    res.status(400).json({
      error: 'Ek içerik göndermeden önce hesabınıza yönetmen / yapımcı belgesi eklemelisiniz.',
    })
    return
  }

  const title = String(body.title ?? '').trim()
  if (!title) {
    res.status(400).json({ error: 'Başlık zorunlu.' })
    return
  }

  const downloadLink = String(
    body.downloadLink ?? body.sourceVideoUrl ?? body.source_video_url ?? '',
  ).trim()

  if (isMainApplication && !downloadLink) {
    res.status(400).json({ error: 'Film indirme linki zorunludur.' })
    return
  }

  if (isMainApplication && body.credits !== undefined) {
    try {
      validateApplicationCredits(body.credits)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Film künyesi eksik.' })
      return
    }
  } else if (isMainApplication) {
    res.status(400).json({ error: 'Film künyesi (yönetmen, yapımcı, oyuncu kadrosu) zorunludur.' })
    return
  }

  const videoUrl = ''

  try {
    externalMediaLink(downloadLink, true)
    externalMediaLink(body.trailerUrl ?? body.trailer_url)
  } catch(error) { res.status(400).json({ error: (error as Error).message }); return }
  const type = normalizeContentType(body.type, 'film')
  const now = new Date().toISOString()
  const parentContentId = String(body.parentContentId ?? body.parent_content_id ?? '').trim() || null

  if (!['main', 'bts', 'teacher_note'].includes(contentFormat)) {
    res.status(400).json({ error: 'Geçersiz içerik formatı.' })
    return
  }

  if (isStudentProgram) {
    if (!creator.school_id) {
      res.status(400).json({ error: 'Genç Sinema başvurusu için okul seçimi zorunludur.' })
      return
    }
    if (contentFormat !== 'main' && !parentContentId) {
      res.status(400).json({ error: 'Kamera arkası veya hoca notu için ana film seçmelisiniz.' })
      return
    }
    if (parentContentId) {
      const parent = dbGet<ContentRow>(
        'SELECT * FROM content WHERE id = ? AND creator_id = ? AND content_format = ?',
        [parentContentId, creator.id, 'main'],
      )
      if (!parent) {
        res.status(400).json({ error: 'Bağlı ana film bulunamadı.' })
        return
      }
    }
  } else if (contentFormat !== 'main' || parentContentId) {
    res.status(400).json({ error: 'Kamera arkası yalnızca Genç Sinema programında kullanılabilir.' })
    return
  }

  const streamProvider = resolveStreamProvider(body, videoUrl)
  const studentStub =
    isStudentProgram && contentFormat === 'main' ? findStudentMainStub(creator.id) : null

  let id = studentStub?.id ?? (body.id ? String(body.id) : slugify(title))
  if (!studentStub) {
    let counter = 1
    while (dbGet('SELECT id FROM content WHERE id = ?', [id])) {
      id = `${slugify(title)}-${counter++}`
    }
  }

  const program = isStudentProgram ? 'student_cinema' : 'standard'
  const schoolId = isStudentProgram ? creator.school_id : null
  const schoolReviewStatus = isStudentProgram && creator.student_application_type !== 'individual' ? 'pending' : 'none'
  const reviewStatus = registrationPaid ? 'pending' : 'payment_pending'
  const durationFields = resolveDurationFields(body)
  const festivalsJson = serializeFestivals(parseFestivalsBody(body) ?? [])

  const contentValues = [
    title,
    String(body.description ?? '').trim(),
    Number(body.year ?? new Date().getFullYear()),
    durationFields.duration,
    durationFields.durationMinutes,
    String(body.rating ?? '13+').trim(),
    type,
    JSON.stringify(body.genres ?? []),
    String(body.poster ?? '').trim(),
    String(body.backdrop ?? body.poster ?? '').trim(),
    videoUrl,
    downloadLink || videoUrl,
    streamProvider,
    String(body.trailerUrl ?? body.trailer_url ?? ''),
    String(body.videoFormat ?? body.video_format ?? 'standard'),
    serializeSubtitles(body.subtitles ?? []),
    body.credits !== undefined ? serializeCredits(body.credits) : '{}',
    festivalsJson,
    parseContentAddedAt(now),
    reviewStatus,
    program,
    contentFormat,
    parentContentId,
    schoolId,
    schoolReviewStatus,
  ] as const

  dbTransaction(() => {
  if (studentStub) {
    dbRun(
      `UPDATE content SET
        title = ?, description = ?, year = ?, duration = ?, duration_minutes = ?, rating = ?, type = ?,
        genres = ?, poster = ?, backdrop = ?, video_url = ?, source_video_url = ?, stream_provider = ?,
        trailer_url = ?, video_format = ?, subtitles_json = ?, credits_json = ?, festivals_json = ?,
        content_added_at = ?, review_status = ?, review_note = NULL, program = ?, content_format = ?,
        parent_content_id = ?, school_id = ?, school_review_status = ?
      WHERE id = ? AND creator_id = ?`,
      [...contentValues, studentStub.id, creator.id],
    )
  } else {
    dbRun(
      `INSERT INTO content (
        id, title, description, year, duration, duration_minutes, rating, type, genres, poster, backdrop,
        video_url, source_video_url, stream_provider, trailer_url, video_format, is_new, new_until, featured,
        subtitles_json, credits_json, festivals_json, content_added_at, license_expires_at, published_at,
        creator_id, review_status, program, content_format, parent_content_id, school_id, school_review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        String(body.description ?? '').trim(),
        Number(body.year ?? new Date().getFullYear()),
        durationFields.duration,
        durationFields.durationMinutes,
        String(body.rating ?? '13+').trim(),
        type,
        JSON.stringify(body.genres ?? []),
        String(body.poster ?? '').trim(),
        String(body.backdrop ?? body.poster ?? '').trim(),
        videoUrl,
        downloadLink || videoUrl,
        streamProvider,
        String(body.trailerUrl ?? body.trailer_url ?? ''),
        String(body.videoFormat ?? body.video_format ?? 'standard'),
        0,
        null,
        0,
        serializeSubtitles(body.subtitles ?? []),
        body.credits !== undefined ? serializeCredits(body.credits) : '{}',
        festivalsJson,
        parseContentAddedAt(now),
        null,
        null,
        creator.id,
        reviewStatus,
        program,
        contentFormat,
        parentContentId,
        schoolId,
        schoolReviewStatus,
      ],
    )
  }

  if (application) {
    linkApplicationDocuments(id, creator.id, application.documentIds)
    saveApplicationDeclaration(id, application.declaration)
  }

  const signer = dbGet<UserRow>('SELECT * FROM users WHERE id = ?', [req.auth!.userId])!
  recordLegalConsent({userId: signer.id, userName: signer.name, userEmail: signer.email, type:'creator_terms', locale:body.submissionTermsLocale as 'tr'|'en', contentId:id, ipAddress:getClientIp(req),userAgent:getUserAgent(req)})
  })
  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [id])!
  res.status(201).json({
    item: mapContent(row),
    reviewStatus,
    program,
    contentFormat,
    schoolReviewStatus,
    paymentRequired: !registrationPaid,
    message: registrationPaid
      ? isStudentProgram && creator.student_application_type !== 'individual'
        ? `Film başvurunuz okul onayına gönderildi. Okul onayından sonra ${BRAND_NAME} incelemesine alınır.`
        : 'Film başvurunuz incelemeye gönderildi. Onaylandıktan sonra yayınlanacaktır.'
      : 'Film başvurunuz kaydedildi. İncelemeye alınması için başvuru ücretini ödemeniz gerekir.',
  })
})

router.patch('/content/:id', requireActiveCreator, (req: CreatorAuthRequest, res) => {
  const creator = req.creator!
  const user = dbGet<Pick<UserRow, 'subscription_expires_at'>>(
    'SELECT subscription_expires_at FROM users WHERE id = ?',
    [req.auth!.userId],
  )
  const registrationPaid = isCreatorRegistrationPaid(creator, user)
  const existing = dbGet<ContentRow>('SELECT * FROM content WHERE id = ? AND creator_id = ?', [
    req.params.id,
    creator.id,
  ])
  if (!existing) {
    res.status(404).json({ error: 'İçerik bulunamadı.' })
    return
  }

  if (existing.review_status === 'published') {
    res.status(400).json({ error: 'Yayınlanmış içerik düzenlenemez. Destek ile iletişime geçin.' })
    return
  }

  if (!registrationPaid) {
    res.status(402).json({
      error: 'Bu içeriği düzenlemek için başvuru ücretini ödemelisiniz.',
      code: 'CREATOR_PAYMENT_REQUIRED',
    })
    return
  }

  const body = req.body as Record<string, unknown>
  const nextDownloadLink =
    body.downloadLink !== undefined || body.sourceVideoUrl !== undefined || body.source_video_url !== undefined
      ? String(body.downloadLink ?? body.sourceVideoUrl ?? body.source_video_url ?? '').trim()
      : (existing.source_video_url ?? existing.video_url ?? '')
  const nextVideoUrl = existing.video_url ?? ''
  let nextTrailerUrl: string
  try {
    externalMediaLink(nextDownloadLink, true)
    nextTrailerUrl = externalMediaLink(body.trailerUrl ?? body.trailer_url ?? existing.trailer_url)
  } catch(error) { res.status(400).json({ error: (error as Error).message }); return }
  const nextStreamProvider = resolveStreamProvider(body, nextVideoUrl || nextDownloadLink)
  const durationFields = resolveDurationFields(body, existing)
  const festivalsParsed = parseFestivalsBody(body)
  const nextReviewStatus = registrationPaid ? 'pending' : 'payment_pending'
  dbRun(
    `UPDATE content SET
      title = ?, description = ?, year = ?, duration = ?, duration_minutes = ?, rating = ?, type = ?,
      genres = ?, poster = ?, backdrop = ?, video_url = ?, source_video_url = ?, stream_provider = ?,
      trailer_url = ?, credits_json = ?, festivals_json = ?, review_status = ?, review_note = NULL
    WHERE id = ? AND creator_id = ?`,
    [
      body.title !== undefined ? String(body.title) : existing.title,
      body.description !== undefined ? String(body.description) : existing.description,
      body.year !== undefined ? Number(body.year) : existing.year,
      durationFields.duration,
      durationFields.durationMinutes,
      body.rating !== undefined ? String(body.rating) : existing.rating,
      body.type !== undefined ? normalizeContentType(body.type, existing.type) : existing.type,
      body.genres !== undefined ? JSON.stringify(body.genres) : existing.genres,
      body.poster !== undefined ? String(body.poster) : existing.poster,
      body.backdrop !== undefined ? String(body.backdrop) : existing.backdrop,
      nextVideoUrl,
      nextDownloadLink,
      nextStreamProvider,
      nextTrailerUrl,
      body.credits !== undefined ? serializeCredits(body.credits) : existing.credits_json ?? '{}',
      festivalsParsed !== undefined
        ? serializeFestivals(festivalsParsed)
        : existing.festivals_json ?? '[]',
      nextReviewStatus,
      existing.id,
      creator.id,
    ],
  )

  const row = dbGet<ContentRow>('SELECT * FROM content WHERE id = ?', [existing.id])!
  res.json({
    item: mapContent(row),
    reviewStatus: nextReviewStatus,
    paymentRequired: !registrationPaid,
    message: registrationPaid
      ? 'Başvurunuz güncellendi ve yeniden incelemeye gönderildi.'
      : 'Başvurunuz güncellendi. İncelemeye alınması için başvuru ücretini ödemeniz gerekir.',
  })
})

router.get('/accounting/months', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  const archived = dbAll<{ month: string }>(
    'SELECT DISTINCT month FROM content_watch_monthly WHERE creator_id = ? ORDER BY month DESC',
    [creator.id],
  )
  const current = monthKey()
  const months = new Set(archived.map((row) => row.month))
  for(const row of listNewAccountingMonths()) months.add(row.month)
  months.add(current)
  res.json({
    months: [...months].sort((a, b) => b.localeCompare(a)).map((month) => ({
      month,
      status: month === current ? 'open' : 'closed',
    })),
  })
})

router.get('/accounting', requireCreator, (req: AuthRequest, res) => {
  const creator = getCreatorForUser(req.auth!.userId)
  if (!creator) {
    res.status(404).json({ error: 'Yapımcı profili bulunamadı.' })
    return
  }

  try {
    const month = String(req.query.month ?? monthKey()).trim()
    if(listNewAccountingMonths().some(row=>row.month===month)) {
      const report=getAccountingReport(month); const items=report.items.filter(i=>i.creatorId===creator.id)
      res.json({month,status:report.closedAt?'closed':'open',totalQualifiedMinutes:Math.round(items.reduce((s,i)=>s+i.qualifiedSeconds,0)/60),totalWatchMinutes:Math.round(items.reduce((s,i)=>s+i.watchSeconds,0)/60),items:items.map(i=>({contentId:i.contentId,title:i.title,type:i.type,program:i.program,qualifiedMinutes:Math.round(i.qualifiedSeconds/60),watchMinutes:Math.round(i.watchSeconds/60),viewerCount:i.views}))});return
    }
    const report = getMonthlyReport(month, { creatorId: creator.id })
    res.json({
      month: report.month,
      status: report.status,
      totalQualifiedMinutes: report.totalQualifiedMinutes,
      totalWatchMinutes: report.totalWatchMinutes,
      items: report.items.map((item) => ({
        contentId: item.contentId,
        title: item.title,
        type: item.type,
        program: item.program,
        qualifiedMinutes: item.qualifiedMinutes,
        watchMinutes: item.watchMinutes,
        viewerCount: item.viewerCount,
      })),
    })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Muhasebe verisi yüklenemedi.' })
  }
})

router.get('/messages', requireCreator, (req: AuthRequest, res) => {
  res.json({ messages: listUserMessages(req.auth!.userId) })
})

router.get('/messages/unread-count', requireCreator, (req: AuthRequest, res) => {
  res.json({ count: countUnreadMessages(req.auth!.userId) })
})

router.patch('/messages/:id/read', requireCreator, (req: AuthRequest, res) => {
  try {
    const message = markMessageRead(req.auth!.userId, req.params.id)
    res.json({ message })
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Mesaj bulunamadı.' })
  }
})

export default router
