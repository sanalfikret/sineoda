#!/usr/bin/env node
/** VPS: docker exec CONTAINER node /app/server/scripts/bootstrap-admin.js */
const bcrypt = require('bcryptjs')
const Database = require('better-sqlite3')
const path = require('path')

const email = process.env.BOOTSTRAP_EMAIL || 'admin@plooy.tv'
const password = process.env.BOOTSTRAP_PASS || 'admin123'
const dbPath = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'sineoda.db')
  : '/app/server/data/sineoda.db'

const db = new Database(dbPath)
const hash = bcrypt.hashSync(password, 10)
const now = new Date().toISOString()
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)

if (existing) {
  db.prepare(
    'UPDATE users SET password_hash = ?, role = ?, email_verified = 1 WHERE id = ?',
  ).run(hash, 'admin', existing.id)
} else {
  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role, created_at, email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)',
  ).run('plooy-admin', 'Plooy Admin', email, hash, 'admin', now)
}

console.log('admin ok:', email)
