import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const localeDir = path.join(root, 'src/locales')
const skip = new Set(['legalDocuments.json'])

function flat(obj, prefix = '') {
  const out = {}
  for (const [key, value] of Object.entries(obj ?? {})) {
    const next = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flat(value, next))
    } else {
      out[next] = value
    }
  }
  return out
}

const files = fs
  .readdirSync(path.join(localeDir, 'tr'))
  .filter((name) => name.endsWith('.json') && !skip.has(name))

const issues = []
for (const file of files) {
  const tr = flat(JSON.parse(fs.readFileSync(path.join(localeDir, 'tr', file), 'utf8')))
  const en = flat(JSON.parse(fs.readFileSync(path.join(localeDir, 'en', file), 'utf8')))
  for (const key of Object.keys(tr)) {
    if (!(key in en)) issues.push(`EN missing ${file}: ${key}`)
  }
  for (const key of Object.keys(en)) {
    if (!(key in tr)) issues.push(`TR missing ${file}: ${key}`)
  }
}

if (issues.length > 0) {
  console.error('i18n parity failed:\n' + issues.join('\n'))
  process.exit(1)
}

console.log(`check-i18n OK (${files.length} namespace files, legalDocuments EN-only by design)`)
