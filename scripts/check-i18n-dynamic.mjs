#!/usr/bin/env node
/**
 * Dinamik oluşturulan çeviri anahtarlarını doğrular (audit-i18n-keys yalnızca t('...') sabitlerini görür).
 * Buradaki her giriş, kodda `t(\`prefix.${değer}\`)` biçiminde üretilen anahtarların TR ve EN dosyalarında
 * var olduğunu kontrol eder. Eksik anahtar arayüzde ham anahtar adı olarak görünür (ör. "returnBack").
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

function flat(obj, prefix = '') {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') Object.assign(out, flat(value, next))
    else out[next] = value
  }
  return out
}
const locales = {}
for (const lang of ['tr', 'en']) {
  locales[lang] = {}
  const dir = path.join(root, 'src/locales', lang)
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    locales[lang][file.slice(0, -5)] = flat(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')))
  }
}

const literals = (text, re) => [...text.matchAll(re)].map((m) => m[1])
const checks = []
const add = (label, ns, keys) => checks.push({ label, ns, keys })

// Header: nav.* anahtarları (common)
add('Header nav', 'common', literals(read('src/components/Header.tsx'), /'(nav\.[A-Za-z]+)'/g))
// LandingHubs: hubs.<key> ve hubs.<key>Text (landing)
add('LandingHubs', 'landing', ['films', 'series', 'originals'].flatMap((k) => [`hubs.${k}`, `hubs.${k}Text`]))
// LandingCategoryShowcase: showcase.tabs.<icon|kisaFilm>.<title|description> (landing)
const icons = new Set([...literals(read('src/utils/landingShowcases.ts'), /icon:\s*'([a-z]+)'/g), 'kisaFilm'])
add('LandingCategoryShowcase', 'landing', [...icons].flatMap((i) => [`showcase.tabs.${i}.title`, `showcase.tabs.${i}.description`]))
// useLegalLocale footer.* (common)
add('useLegalLocale footer', 'common', ['terms', 'privacy', 'kvkk', 'consent', 'cookies'].map((k) => `footer.${k}`))
// AccountPage status.* ve consentTypes.* (account)
add('AccountPage status', 'account', ['active', 'expired', 'cancelled', 'free'].map((k) => `status.${k}`))
const consentUnion = read('server/src/constants/legal.ts').match(/export type ConsentType\s*=\s*([^;]+?)\n\n/s)?.[1] ?? ''
add('AccountPage consentTypes', 'account', literals(consentUnion, /'([a-z-]+)'/g).map((k) => `consentTypes.${k}`))
// ContactPage contact.subjects.* (common)
const contactSrc = read('src/pages/ContactPage.tsx')
const subjectsMatch = contactSrc.match(/SUBJECT_VALUES\s*=\s*\[([^\]]+)\]/) ?? read('src/constants/contact.ts').match(/SUBJECT_VALUES\s*=\s*\[([^\]]+)\]/)
add('ContactPage subjects', 'common', literals(subjectsMatch?.[1] ?? '', /'([a-z_-]+)'/g).map((k) => `contact.subjects.${k}`))
// CreatorDashboardPage documents.types.* (creator, keyPrefix dashboard)
add('Creator document types', 'creator', literals(read('src/constants/creatorLegal.ts'), /value:\s*'([a-z_-]+)'/g).map((k) => `dashboard.documents.types.${k}`))
// LegalPage returnLabels.* (legalShell) — kod içindeki tip birliği ile birebir
add('LegalPage return labels', 'legalShell', literals(read('src/pages/LegalPage.tsx'), /'(returnLabels\.[A-Za-z]+)'/g))

let failed = 0
for (const { label, ns, keys } of checks) {
  if (keys.length === 0) {
    console.error(`check-i18n-dynamic FAIL: ${label} için anahtar listesi boş (kaynak deseni değişmiş olabilir)`)
    failed++
    continue
  }
  for (const key of keys) {
    for (const lang of ['tr', 'en']) {
      if (!(key in (locales[lang][ns] ?? {}))) {
        console.error(`check-i18n-dynamic FAIL: ${label}: ${lang}/${ns}.json içinde "${key}" yok`)
        failed++
      }
    }
  }
}
if (failed) process.exit(1)
console.log(`check-i18n-dynamic OK (${checks.length} dinamik kaynak, ${checks.reduce((s, c) => s + c.keys.length, 0)} anahtar)`)
