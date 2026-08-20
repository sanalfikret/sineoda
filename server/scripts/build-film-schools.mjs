import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = process.argv[2]
if (!sourcePath) {
  console.error('Usage: node build-film-schools.mjs <rts-table.txt>')
  process.exit(1)
}

const text = fs.readFileSync(sourcePath, 'utf8')

function slugify(value) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const seen = new Map()

for (const line of text.split('\n')) {
  if (!line.startsWith('|') || line.includes('Üniversite | Program')) continue
  const uniMatch = line.match(/\|\s*([^|]+?)\s*•\s*([^|]+?)\s*•\s*([^|]+?)\s*\|/)
  if (!uniMatch) continue
  const university = uniMatch[1].trim()
  const city = uniMatch[2].trim()
  const type = uniMatch[3].trim()
  const programMatch = line.match(/\|\s*[^|]+\|\s*([^|•]+?)\s*•/)
  const program = programMatch?.[1]?.trim() ?? 'Radyo, Televizyon ve Sinema'

  if (/yurt dışı|kirgizistan/i.test(city)) continue

  const key = slugify(university)
  if (!seen.has(key)) {
    seen.set(key, { university, city, type, program })
  }
}

const extra = [
  { id: 'bahcesehir-sinema-tv', name: 'Bahçeşehir Üniversitesi — Sinema ve Televizyon', program: 'Sinema ve Televizyon' },
  { id: 'mimar-sinan-sinema-tv', name: 'Mimar Sinan Güzel Sanatlar Üniversitesi — Sinema ve Televizyon', program: 'Sinema ve Televizyon' },
  { id: 'anadolu-sinema-tv', name: 'Anadolu Üniversitesi — Sinema ve Televizyon', program: 'Sinema ve Televizyon' },
  { id: 'istanbul-okan-sinema-tv', name: 'İstanbul Okan Üniversitesi — Sinema ve Televizyon', program: 'Sinema ve Televizyon' },
  { id: 'isik-sinema-tv', name: 'Işık Üniversitesi — Sinema ve Televizyon', program: 'Sinema ve Televizyon' },
  { id: 'istanbul-arel-sinema-tv', name: 'İstanbul Arel Üniversitesi — Sinema ve Televizyon', program: 'Sinema ve Televizyon' },
  { id: 'afyon-kocatepe-sinema-tv', name: 'Afyon Kocatepe Üniversitesi — Sinema ve Televizyon', program: 'Sinema ve Televizyon' },
  { id: 'cankiri-karatekin-sinema-tv', name: 'Çankırı Karatekin Üniversitesi — Sinema ve Televizyon', program: 'Sinema ve Televizyon' },
  { id: 'izmir-ekonomi-sdm', name: 'İzmir Ekonomi Üniversitesi — Sinema ve Dijital Medya', program: 'Sinema ve Dijital Medya' },
  { id: 'baskent-film-tasarimi', name: 'Başkent Üniversitesi — Film Tasarımı ve Yönetimi', program: 'Film Tasarımı ve Yönetimi' },
  { id: 'diger', name: 'Diğer / Okulum listede yok', program: 'Diğer' },
]

for (const item of extra) {
  if (!seen.has(item.id)) {
    seen.set(item.id, { university: item.name, city: '', type: '', program: item.program, id: item.id })
  }
}

const rows = [...seen.entries()]
  .map(([key, value]) => ({
    id: value.id ?? key,
    name: `${value.university} — ${value.program}`,
    slug: value.id ?? key,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'tr'))

const out = `/** Türkiye sinema / RTV programları — YÖK tercih listelerinden derlendi */\nexport const TURKEY_FILM_SCHOOLS = ${JSON.stringify(rows, null, 2)} as const\n`

fs.writeFileSync(path.join(__dirname, '../src/data/turkeyFilmSchools.ts'), out)
console.log(`Wrote ${rows.length} schools`)
