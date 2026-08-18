import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs, { type Database } from 'sql.js'
import { config } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = config.dataDir
const dbPath = path.join(dataDir, 'sineoda.db')
export const uploadsDir = config.uploadsDir

let db: Database

export async function initDatabase() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  const SQL = await initSqlJs()
  if (fs.existsSync(dbPath)) {
    const file = fs.readFileSync(dbPath)
    db = new SQL.Database(file)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      is_kids INTEGER NOT NULL DEFAULT 0
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      year INTEGER NOT NULL,
      duration TEXT NOT NULL,
      rating TEXT NOT NULL,
      type TEXT NOT NULL,
      genres TEXT NOT NULL,
      poster TEXT NOT NULL,
      backdrop TEXT NOT NULL,
      video_url TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS category_items (
      category_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (category_id, content_id)
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS watchlist (
      profile_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (profile_id, content_id)
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );
  `)

  runMigrations()
  persist()
}

function runMigrations() {
  ensureColumn('content', 'stream_provider', "TEXT DEFAULT 'custom'")
  ensureColumn('content', 'trailer_url', "TEXT DEFAULT ''")
  ensureColumn('content', 'video_format', "TEXT DEFAULT 'standard'")
  ensureColumn('content', 'is_new', 'INTEGER DEFAULT 0')
  ensureColumn('content', 'new_until', 'TEXT')
  ensureColumn('content', 'subtitles_json', "TEXT DEFAULT '[]'")
  ensureColumn('users', 'subscription_status', "TEXT DEFAULT 'free'")
  ensureColumn('users', 'subscription_plan', 'TEXT')
  ensureColumn('users', 'subscription_expires_at', 'TEXT')
  ensureColumn('users', 'phone', 'TEXT')
  ensureColumn('users', 'phone_verified', 'INTEGER DEFAULT 0')
  ensureColumn('episodes', 'subtitles_json', "TEXT DEFAULT '[]'")

  db.run(`
    CREATE TABLE IF NOT EXISTS phone_verification_codes (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      season INTEGER NOT NULL,
      episode_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      duration TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL,
      stream_provider TEXT DEFAULT 'custom',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      merchant_oid TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS watch_progress (
      profile_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      episode_id TEXT NOT NULL DEFAULT '',
      position_seconds REAL NOT NULL DEFAULT 0,
      duration_seconds REAL NOT NULL DEFAULT 0,
      total_watched_seconds REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (profile_id, content_id, episode_id)
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS site_visits (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT,
      visit_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS online_presence (
      session_id TEXT PRIMARY KEY,
      user_id TEXT,
      profile_id TEXT,
      last_seen_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS watch_activity (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      seconds_watched REAL NOT NULL,
      activity_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)
}

function ensureColumn(table: string, column: string, definition: string) {
  const columns = dbAll<{ name: string }>(`PRAGMA table_info(${table})`)
  if (!columns.some((col) => col.name === column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

function persist() {
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

export function dbRun(sql: string, params: unknown[] = []) {
  db.run(sql, params as (string | number | null)[])
  persist()
}

export function dbGet<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params as (string | number | null)[])
  if (stmt.step()) {
    const row = stmt.getAsObject() as T
    stmt.free()
    return row
  }
  stmt.free()
  return undefined
}

export function dbAll<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params as (string | number | null)[])
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

export function dbExec(sql: string) {
  db.exec(sql)
  persist()
}
