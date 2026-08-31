import fs from 'node:fs'
import path from 'node:path'
import initSqlJs, { type Database } from 'sql.js'
import { config } from './config.js'
import { BRAND_NAME } from './constants/brand.js'
import { resolveWritableDir } from './storagePaths.js'

let dataDir = config.dataDir
let dbPath = path.join(dataDir, 'sineoda.db')
export let uploadsDir = config.uploadsDir

let db: Database

export async function initDatabase() {
  dataDir = resolveWritableDir(config.dataDir, 'data')
  dbPath = path.join(dataDir, 'sineoda.db')
  uploadsDir = resolveWritableDir(config.uploadsDir, 'uploads')

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

  db.run(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
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
  ensureColumn('content', 'credits_json', "TEXT DEFAULT '{}'")
  ensureColumn('content', 'content_added_at', 'TEXT')
  ensureColumn('content', 'license_expires_at', 'TEXT')
  ensureColumn('content', 'published_at', 'TEXT')
  ensureColumn('content', 'source_video_url', 'TEXT')

  db.run(`
    UPDATE content
    SET content_added_at = COALESCE(content_added_at, datetime('now'))
    WHERE content_added_at IS NULL OR content_added_at = ''
  `)
  db.run(`
    UPDATE content
    SET published_at = COALESCE(published_at, content_added_at, datetime('now'))
    WHERE published_at IS NULL OR published_at = ''
  `)
  ensureColumn('users', 'subscription_status', "TEXT DEFAULT 'free'")
  ensureColumn('users', 'subscription_plan', 'TEXT')
  ensureColumn('users', 'subscription_expires_at', 'TEXT')
  ensureColumn('users', 'subscription_started_at', 'TEXT')
  ensureColumn('users', 'subscription_cancelled_at', 'TEXT')
  ensureColumn('users', 'pending_plan_id', 'TEXT')
  ensureColumn('users', 'student_id_url', 'TEXT')
  ensureColumn('users', 'phone', 'TEXT')
  ensureColumn('users', 'phone_verified', 'INTEGER DEFAULT 0')
  ensureColumn('users', 'email_verified', 'INTEGER DEFAULT 0')

  const emailVerificationBackfill = dbGet<{ value: string }>(
    "SELECT value FROM site_settings WHERE key = 'email_verification_backfill'",
  )
  if (!emailVerificationBackfill) {
    db.run('UPDATE users SET email_verified = 1')
    db.run("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('email_verification_backfill', '1')")
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );
  `)

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

  ensureColumn('episodes', 'subtitles_json', "TEXT DEFAULT '[]'")

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
    CREATE TABLE IF NOT EXISTS playback_sessions (
      user_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      profile_id TEXT,
      content_id TEXT NOT NULL,
      episode_id TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_watch_usage (
      profile_id TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      total_seconds REAL NOT NULL DEFAULT 0,
      title_starts INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (profile_id, usage_date)
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_watch_titles (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      content_id TEXT NOT NULL,
      episode_id TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      UNIQUE (profile_id, usage_date, content_id, episode_id)
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

  db.run(`
    CREATE TABLE IF NOT EXISTS content_watch_monthly (
      content_id TEXT NOT NULL,
      month TEXT NOT NULL,
      creator_id TEXT,
      program TEXT NOT NULL DEFAULT 'standard',
      qualified_seconds REAL NOT NULL DEFAULT 0,
      watch_seconds REAL NOT NULL DEFAULT 0,
      viewer_count INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      PRIMARY KEY (content_id, month)
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS watch_accounting_periods (
      month TEXT PRIMARY KEY,
      total_qualified_seconds REAL NOT NULL DEFAULT 0,
      total_watch_seconds REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      closed_at TEXT
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS payment_settlement_periods (
      period_id TEXT PRIMARY KEY,
      net_revenue REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      confirmed_at TEXT,
      paid_at TEXT,
      updated_at TEXT
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS content_reactions (
      profile_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      reaction TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (profile_id, content_id)
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS landing_slider (
      content_id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS landing_showcases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'film',
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS landing_showcase_items (
      showcase_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (showcase_id, content_id)
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS landing_monthly_winners (
      content_id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS landing_student_picks (
      content_id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS journal_posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      cover_image TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '${BRAND_NAME}',
      content_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  ensureColumn('content', 'creator_id', 'TEXT')
  db.run(`
    UPDATE content
    SET source_video_url = video_url
    WHERE creator_id IS NOT NULL
      AND (source_video_url IS NULL OR source_video_url = '')
  `)
  ensureColumn('content', 'review_status', "TEXT DEFAULT 'published'")
  ensureColumn('watch_progress', 'qualified', 'INTEGER DEFAULT 0')
  ensureColumn('watch_progress', 'qualified_seconds', 'REAL DEFAULT 0')
  ensureColumn('watch_activity', 'content_id', 'TEXT')

  db.run(`
    UPDATE content
    SET review_status = 'published'
    WHERE review_status IS NULL OR review_status = ''
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      studio_name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      legal_accepted_at TEXT,
      created_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS creator_documents (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS creator_qualified_activity (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      episode_id TEXT NOT NULL DEFAULT '',
      profile_id TEXT NOT NULL,
      seconds_watched REAL NOT NULL,
      activity_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS film_schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );
  `)

  ensureColumn('creators', 'program', "TEXT NOT NULL DEFAULT 'standard'")
  ensureColumn('creators', 'school_id', 'TEXT')
  ensureColumn('creators', 'project_crew', "TEXT NOT NULL DEFAULT ''")
  ensureColumn('creators', 'registration_paid_at', 'TEXT')
  ensureColumn('creators', 'pending_film_link', 'TEXT')

  db.run(`
    UPDATE creators
    SET status = 'approved'
    WHERE status = 'pending' AND (program IS NULL OR program = 'standard')
  `)
  db.run(`
    UPDATE creators
    SET registration_paid_at = created_at
    WHERE registration_paid_at IS NULL
      AND (program IS NULL OR program = 'standard')
      AND (
        EXISTS (SELECT 1 FROM content c WHERE c.creator_id = creators.id)
        OR EXISTS (SELECT 1 FROM creator_documents cd WHERE cd.creator_id = creators.id)
      )
  `)
  ensureColumn('content', 'program', "TEXT NOT NULL DEFAULT 'standard'")
  ensureColumn('content', 'content_format', "TEXT NOT NULL DEFAULT 'main'")
  ensureColumn('content', 'parent_content_id', 'TEXT')
  ensureColumn('content', 'school_id', 'TEXT')
  ensureColumn('content', 'school_review_status', "TEXT NOT NULL DEFAULT 'none'")
  ensureColumn('content', 'monthly_award_enabled', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn('content', 'monthly_award_period', 'TEXT')
  ensureColumn('content', 'monthly_award_badge', 'TEXT')
  ensureColumn('content', 'application_declaration_json', 'TEXT')

  db.run(`
    DELETE FROM category_items
    WHERE content_id IN (SELECT id FROM content WHERE program = 'student_cinema')
      AND category_id != 'genc-sinema'
  `)
  db.run(`
    DELETE FROM category_items
    WHERE content_id IN (SELECT id FROM content WHERE program = 'shooting_notes')
      AND category_id NOT LIKE 'cekim-%'
  `)
  db.run(`
    DELETE FROM category_items
    WHERE content_id IN (
      SELECT id FROM content
      WHERE COALESCE(program, 'standard') = 'standard'
        AND COALESCE(content_format, 'main') = 'main'
    )
      AND category_id = 'genc-sinema'
  `)
  ensureColumn('creator_documents', 'content_id', 'TEXT')
  ensureColumn('content', 'monthly_award_prize', 'TEXT')
  ensureColumn('content', 'festivals_json', "TEXT NOT NULL DEFAULT '[]'")
  ensureColumn('content', 'duration_minutes', 'INTEGER')
  ensureColumn('categories', 'hidden', 'INTEGER NOT NULL DEFAULT 0')

  db.run(`
    CREATE TABLE IF NOT EXISTS user_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      sent_by_admin_id TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS ad_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      video_url TEXT NOT NULL,
      kids_video_url TEXT,
      target_all INTEGER NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'once',
      skip_mode TEXT NOT NULL DEFAULT 'skippable',
      skip_after_seconds INTEGER NOT NULL DEFAULT 5,
      starts_at TEXT,
      ends_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS ad_campaign_content (
      campaign_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      PRIMARY KEY (campaign_id, content_id)
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS ad_campaign_views (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      profile_id TEXT,
      content_id TEXT NOT NULL,
      viewed_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS legal_consents (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      consent_type TEXT NOT NULL,
      document_slug TEXT NOT NULL,
      document_version TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      consent_text TEXT NOT NULL,
      accepted_at TEXT NOT NULL
    );
  `)
}

function ensureColumn(table: string, column: string, definition: string) {
  const exists = dbGet<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [table],
  )
  if (!exists) return

  const columns = dbAll<{ name: string }>(`PRAGMA table_info(${table})`)
  if (!columns.some((col) => col.name === column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

function persist() {
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

export function getDbPath() {
  return dbPath
}

export function dbRun(sql: string, params: unknown[] = []) {
  db.run(sql, params as (string | number | null)[])
  persist()
}

export function dbGet<T extends object>(sql: string, params: unknown[] = []) {
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

export function dbAll<T extends object>(sql: string, params: unknown[] = []) {
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
