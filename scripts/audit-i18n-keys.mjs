import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const localeDir = path.join(root, 'src/locales')
const skipLocaleFiles = new Set(['legalDocuments.json'])
const skipKeys = new Set(['categories'])

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

function loadLocaleMaps() {
  const trDir = path.join(localeDir, 'tr')
  const namespaces = {}
  for (const file of fs.readdirSync(trDir)) {
    if (!file.endsWith('.json') || skipLocaleFiles.has(file)) continue
    const ns = file.replace(/\.json$/, '')
    namespaces[ns] = {
      tr: flat(JSON.parse(fs.readFileSync(path.join(localeDir, 'tr', file), 'utf8'))),
      en: flat(JSON.parse(fs.readFileSync(path.join(localeDir, 'en', file), 'utf8'))),
    }
  }
  return namespaces
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full)
  }
  return files
}

function parseTranslators(source) {
  const translators = new Map()
  const hookPattern =
    /const\s*\{([^}]+)\}\s*=\s*useTranslation\(\s*(?:\[([^\]]+)\]|['"]([^'"]+)['"]|)\s*(?:,\s*\{([^}]*)\})?\s*\)/g

  for (const match of source.matchAll(hookPattern)) {
    const destructuring = match[1]
    const arrayNs = match[2]
    const singleNs = match[3]
    const options = match[4] ?? ''
    const prefixMatch = options.match(/keyPrefix:\s*['"]([^'"]+)['"]/)
    const keyPrefix = prefixMatch?.[1] ?? ''
    const ns = singleNs ?? arrayNs?.split(',')[0]?.trim().replace(/['"]/g, '') ?? 'common'

    for (const part of destructuring.split(',')) {
      const trimmed = part.trim()
      if (!trimmed) continue
      const aliasMatch = trimmed.match(/^t(?:\s*:\s*(\w+))?$/)
      if (!aliasMatch) continue
      const alias = aliasMatch[1] ?? 't'
      translators.set(alias, { ns, keyPrefix })
    }
  }

  if (translators.size === 0) {
    translators.set('t', { ns: 'common', keyPrefix: '' })
  }

  return translators
}

function resolveLookup(rawKey, translator) {
  if (rawKey.includes('${')) return null

  if (rawKey.includes(':')) {
    const [ns, key] = rawKey.split(':', 2)
    return { ns, key }
  }

  const key = translator.keyPrefix ? `${translator.keyPrefix}.${rawKey}` : rawKey
  return { ns: translator.ns, key }
}

const namespaces = loadLocaleMaps()
const files = walk(srcDir)
const missing = []

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const translators = parseTranslators(source)
  const rel = path.relative(root, file)
  const aliasPattern = new RegExp(
    `\\b(${[...translators.keys()].map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*\\(\\s*['"]([^'"]+)['"]`,
    'g',
  )

  for (const match of source.matchAll(aliasPattern)) {
    const fn = match[1]
    const rawKey = match[2]
    if (skipKeys.has(rawKey)) continue

    const translator = translators.get(fn)
    if (!translator) continue

    const lookup = resolveLookup(rawKey, translator)
    if (!lookup) continue

    const locale = namespaces[lookup.ns]
    if (!locale) {
      missing.push(`${rel}: namespace "${lookup.ns}" not found for key "${lookup.key}"`)
      continue
    }
    if (!(lookup.key in locale.tr)) missing.push(`TR missing ${lookup.ns}.${lookup.key} (used in ${rel})`)
    if (!(lookup.key in locale.en)) missing.push(`EN missing ${lookup.ns}.${lookup.key} (used in ${rel})`)
  }
}

if (missing.length > 0) {
  console.error('i18n key audit failed:\n' + [...new Set(missing)].join('\n'))
  process.exit(1)
}

console.log(`audit-i18n-keys OK (${files.length} source files)`)
