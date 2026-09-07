import { dbGet, dbRun } from '../db.js'
export function readJournalTranslations(id:string): Record<string,{title:string;excerpt:string;body:string}> {
 const row=dbGet<{value:string}>('SELECT value FROM site_settings WHERE key = ?', ['journal_translation:'+id]);return row?JSON.parse(row.value):{}
}
export function saveJournalEnglish(id:string,body:Record<string,unknown>){
 if(!['titleEn','excerptEn','bodyEn'].some(key=>body[key]!==undefined))return
 const old=readJournalTranslations(id).en??{title:'',excerpt:'',body:''}
 const en={...old};for(const field of ['title','excerpt','body'] as const){if(body[field+'En']!==undefined)en[field]=String(body[field+'En']).trim()}
 dbRun('INSERT OR REPLACE INTO site_settings (key,value) VALUES (?,?)',['journal_translation:'+id,JSON.stringify({en})])
}
