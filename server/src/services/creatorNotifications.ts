import { dbGet } from '../db.js'
import { sendMessageToUser } from './userMessages.js'
import type { ContentRow } from '../types.js'

export function notifyCreatorFilmReview(input: {
  content: ContentRow
  reviewStatus: string
  previousStatus?: string | null
  adminUserId: string
}) {
  if (!input.content.creator_id) return
  if (input.previousStatus === input.reviewStatus) return
  if (input.reviewStatus !== 'published' && input.reviewStatus !== 'rejected') return

  const creator = dbGet<{ user_id: string }>('SELECT user_id FROM creators WHERE id = ?', [
    input.content.creator_id,
  ])
  if (!creator) return

  const title = input.content.title.trim() || 'Filminiz'

  if (input.reviewStatus === 'published') {
    sendMessageToUser({
      userId: creator.user_id,
      subject: `Film onaylandı: ${title}`,
      body: `"${title}" film başvurunuz incelendi ve yayına alındı. Tebrikler — panelinizden durumu takip edebilirsiniz.`,
      sentByAdminId: input.adminUserId,
    })
    return
  }

  sendMessageToUser({
    userId: creator.user_id,
    subject: `Film reddedildi: ${title}`,
    body: `"${title}" film başvurunuz incelendi. Şu an yayına alınamadı. Sorularınız için iletişim sayfasından bize ulaşabilirsiniz.`,
    sentByAdminId: input.adminUserId,
  })
}
