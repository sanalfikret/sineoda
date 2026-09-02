import { dbGet } from '../db.js'
import { sendMessageToUser } from './userMessages.js'
import type { ContentRow } from '../types.js'

export function notifyCreatorFilmReview(input: {
  content: ContentRow
  reviewStatus: string
  previousStatus?: string | null
  adminUserId: string
  reviewNote?: string | null
}) {
  if (!input.content.creator_id) return
  if (input.previousStatus === input.reviewStatus) return
  if (input.reviewStatus !== 'published' && input.reviewStatus !== 'rejected') return

  const creator = dbGet<{ user_id: string }>('SELECT user_id FROM creators WHERE id = ?', [
    input.content.creator_id,
  ])
  if (!creator) return

  const title = input.content.title.trim() || 'Filminiz'
  const note = input.reviewNote?.trim()

  if (input.reviewStatus === 'published') {
    sendMessageToUser({
      userId: creator.user_id,
      subject: `Film onaylandı: ${title}`,
      body: `"${title}" film başvurunuz incelendi ve yayına alındı. Tebrikler — panelinizden durumu takip edebilirsiniz.`,
      sentByAdminId: input.adminUserId,
    })
    return
  }

  const rejectionBody = note
    ? `"${title}" film başvurunuz incelendi ve şu an yayına alınamadı.\n\nRed gerekçesi: ${note}\n\nGerekli düzeltmeleri yapıp panelden tekrar gönderebilirsiniz.`
    : `"${title}" film başvurunuz incelendi. Şu an yayına alınamadı. Gerekli düzeltmeleri yapıp panelden tekrar gönderebilirsiniz.`

  sendMessageToUser({
    userId: creator.user_id,
    subject: `Film reddedildi: ${title}`,
    body: rejectionBody,
    sentByAdminId: input.adminUserId,
  })
}
