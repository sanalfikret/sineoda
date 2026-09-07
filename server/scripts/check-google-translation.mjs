import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'plooy-translate-'))
process.env.DATA_DIR=path.join(temp,'data');process.env.UPLOADS_DIR=path.join(temp,'uploads')
const {initDatabase,dbRun}=await import('../src/db.ts');await initDatabase()
const {translateEnglish}=await import('../src/services/googleTranslation.ts')
const original=globalThis.fetch
try {
 delete process.env.GOOGLE_TRANSLATE_API_KEY
 await assert.rejects(translateEnglish('Eksik'),/anahtarı/)
 process.env.GOOGLE_TRANSLATE_API_KEY='test-only'
 let calls=0
 globalThis.fetch=async (url,options)=>{calls++;assert.equal(JSON.parse(options.body).model,'nmt');assert.equal(options.headers['X-Goog-Api-Key'],'test-only');return new Response(JSON.stringify({data:{translations:[{translatedText:'Beneath the Sea'}]}}))}
 assert.deepEqual(await Promise.all([translateEnglish('Denizin Dibinde'),translateEnglish('Denizin Dibinde')]),['Beneath the Sea','Beneath the Sea'])
 assert.equal(await translateEnglish('Denizin Dibinde'),'Beneath the Sea');assert.equal(calls,1)
 globalThis.fetch=async()=>new Response('{}',{status:403})
 await assert.rejects(translateEnglish('Hata'),/403/)
 dbRun('INSERT OR REPLACE INTO site_settings (key,value) VALUES (?,?)',['translation_usage:'+new Date().toISOString().slice(0,7),'450000'])
 await assert.rejects(translateEnglish('Limit'),/sınırına/)
 assert.equal(await translateEnglish('Denizin Dibinde'),'Beneath the Sea')
 console.log('PASS: missing key, NMT request, concurrent deduplication, persistent cache, provider error, monthly limit')
} finally {globalThis.fetch=original;fs.rmSync(temp,{recursive:true,force:true})}
