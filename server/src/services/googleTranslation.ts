import { createHash } from 'node:crypto'
import { dbGet, dbRun } from '../db.js'
const pending = new Map<string, Promise<string>>()
export async function translateEnglish(text: string): Promise<string> {
  text = text.trim()
  if (!text) return ''
  if (text.length > 20000) throw new Error('Çevrilecek metin en fazla 20000 karakter olabilir.')
  const cacheKey = 'translation_en:' + createHash('sha256').update(text).digest('hex')
  const cached = dbGet<{value:string}>('SELECT value FROM site_settings WHERE key = ?', [cacheKey])
  if (cached) return cached.value
  const active = pending.get(cacheKey)
  if (active) return active
  const task = (async () => {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY?.trim()
    if (!key) throw new Error('Google çeviri anahtarı sunucuda tanımlı değil. İngilizceyi elle girebilirsiniz.')
    const monthKey = 'translation_usage:' + new Date().toISOString().slice(0,7)
    const used = Number(dbGet<{value:string}>('SELECT value FROM site_settings WHERE key = ?', [monthKey])?.value ?? 0)
    const count = Array.from(text).length
    if (used + count > 450000) throw new Error('Aylık otomatik çeviri sınırına ulaşıldı. İngilizceyi elle girebilirsiniz.')
    // Reserve before the request; failed requests are counted conservatively as well.
    dbRun('INSERT OR REPLACE INTO site_settings (key,value) VALUES (?,?)', [monthKey, String(used+count)])
    let response: Response
    try {
      response = await fetch('https://translation.googleapis.com/language/translate/v2', {
        method:'POST', headers:{'Content-Type':'application/json','X-Goog-Api-Key':key},
        body:JSON.stringify({q:text,source:'tr',target:'en',format:'text',model:'nmt'}), signal:AbortSignal.timeout(15000)
      })
    } catch { throw new Error('Google çevirisine ulaşılamadı. Tekrar deneyin veya İngilizceyi elle girin.') }
    if (!response.ok) throw new Error('Google çeviri isteği reddedildi ('+response.status+'). API, faturalandırma ve IP ayarlarını kontrol edin.')
    const data = await response.json() as {data?:{translations?:{translatedText?:string}[]}}
    const result = data.data?.translations?.[0]?.translatedText
    if (typeof result !== 'string' || !result.trim()) throw new Error('Google geçerli bir çeviri döndürmedi.')
    dbRun('INSERT OR REPLACE INTO site_settings (key,value) VALUES (?,?)', [cacheKey,result])
    return result
  })()
  pending.set(cacheKey,task)
  try { return await task } finally { pending.delete(cacheKey) }
}
