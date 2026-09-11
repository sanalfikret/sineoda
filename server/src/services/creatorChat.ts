import { dbGet, dbRun } from '../db.js'

let initialized = false

/** Admin ↔ yapımcı sohbet tablosu. Hem route hem admin listeleri çağırabilir. */
export function ensureCreatorChatTable() {
  if (initialized) return
  dbRun(
    'CREATE TABLE IF NOT EXISTS creator_chat (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, sender_id TEXT NOT NULL, from_admin INTEGER NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT, request_id TEXT NOT NULL, UNIQUE(user_id, sender_id, request_id))',
  )
  dbRun('CREATE INDEX IF NOT EXISTS creator_chat_user ON creator_chat(user_id, created_at)')
  initialized = true
}

/** Bir yapımcıdan gelen okunmamış mesaj sayısı (admin görünümü). */
export function countUnreadFromCreator(userId: string) {
  ensureCreatorChatTable()
  const row = dbGet<{ count: number }>(
    'SELECT COUNT(*) AS count FROM creator_chat WHERE user_id = ? AND from_admin = 0 AND read_at IS NULL',
    [userId],
  )
  return row?.count ?? 0
}
