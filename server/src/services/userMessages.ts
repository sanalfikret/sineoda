import { v4 as uuid } from 'uuid'
import { dbAll, dbGet, dbRun } from '../db.js'

export interface UserMessageRow {
  id: string
  user_id: string
  subject: string
  body: string
  sent_by_admin_id: string | null
  read_at: string | null
  created_at: string
}

export function mapMessage(row: UserMessageRow) {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    body: row.body,
    sentByAdminId: row.sent_by_admin_id,
    readAt: row.read_at,
    createdAt: row.created_at,
    isRead: Boolean(row.read_at),
  }
}

export function listUserMessages(userId: string) {
  const rows = dbAll<UserMessageRow>(
    'SELECT * FROM user_messages WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  )
  return rows.map(mapMessage)
}

export function countUnreadMessages(userId: string) {
  const row = dbGet<{ count: number }>(
    'SELECT COUNT(*) AS count FROM user_messages WHERE user_id = ? AND read_at IS NULL',
    [userId],
  )
  return row?.count ?? 0
}

export function sendMessageToUser(input: {
  userId: string
  subject: string
  body: string
  sentByAdminId: string
}) {
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject || !body) {
    throw new Error('Konu ve mesaj metni zorunlu.')
  }

  const user = dbGet('SELECT id FROM users WHERE id = ?', [input.userId])
  if (!user) {
    throw new Error('Kullanıcı bulunamadı.')
  }

  const id = uuid()
  const now = new Date().toISOString()
  dbRun(
    'INSERT INTO user_messages (id, user_id, subject, body, sent_by_admin_id, read_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)',
    [id, input.userId, subject, body, input.sentByAdminId, now],
  )
  return mapMessage(
    dbGet<UserMessageRow>('SELECT * FROM user_messages WHERE id = ?', [id])!,
  )
}

export function broadcastMessage(input: {
  subject: string
  body: string
  sentByAdminId: string
  audience: 'all' | 'active_subscribers'
}) {
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject || !body) {
    throw new Error('Konu ve mesaj metni zorunlu.')
  }

  let userIds: string[] = []
  if (input.audience === 'active_subscribers') {
    userIds = dbAll<{ id: string }>(
      "SELECT id FROM users WHERE role = 'user' AND subscription_status = 'active'",
    ).map((row) => row.id)
  } else {
    userIds = dbAll<{ id: string }>("SELECT id FROM users WHERE role = 'user'").map((row) => row.id)
  }

  const now = new Date().toISOString()
  let sent = 0
  for (const userId of userIds) {
    dbRun(
      'INSERT INTO user_messages (id, user_id, subject, body, sent_by_admin_id, read_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)',
      [uuid(), userId, subject, body, input.sentByAdminId, now],
    )
    sent += 1
  }

  return { sent, audience: input.audience }
}

export function markMessageRead(userId: string, messageId: string) {
  const row = dbGet<UserMessageRow>('SELECT * FROM user_messages WHERE id = ? AND user_id = ?', [
    messageId,
    userId,
  ])
  if (!row) {
    throw new Error('Mesaj bulunamadı.')
  }
  if (!row.read_at) {
    dbRun('UPDATE user_messages SET read_at = ? WHERE id = ?', [new Date().toISOString(), messageId])
  }
  return mapMessage(dbGet<UserMessageRow>('SELECT * FROM user_messages WHERE id = ?', [messageId])!)
}
