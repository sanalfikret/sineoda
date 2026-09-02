/** VPS bootstrap — sql.js (better-sqlite3 yok) */
import fs from 'node:fs'
import path from 'node:path'
import initSqlJs from 'sql.js'
import bcrypt from 'bcryptjs'

const email = process.env.BOOTSTRAP_EMAIL || 'admin@plooy.tv'
const password = process.env.BOOTSTRAP_PASS || 'admin123'
const dataDir = process.env.DATA_DIR || '/app/server/data'
const dbPath = path.join(dataDir, 'sineoda.db')

fs.mkdirSync(dataDir, { recursive: true })

const SQL = await initSqlJs()
const db = fs.existsSync(dbPath)
  ? new SQL.Database(fs.readFileSync(dbPath))
  : new SQL.Database()

const hash = bcrypt.hashSync(password, 10)
const now = new Date().toISOString()

const find = db.prepare('SELECT id FROM users WHERE email = ?')
find.bind([email])
const existing = find.step() ? String(find.getAsObject().id) : null
find.free()

if (existing) {
  db.run('UPDATE users SET password_hash = ?, role = ?, email_verified = 1 WHERE id = ?', [
    hash,
    'admin',
    existing,
  ])
} else {
  db.run(
    'INSERT INTO users (id, name, email, password_hash, role, created_at, email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)',
    ['plooy-admin', 'Plooy Admin', email, hash, 'admin', now],
  )
}

fs.writeFileSync(dbPath, Buffer.from(db.export()))
console.log('admin ok:', email)
