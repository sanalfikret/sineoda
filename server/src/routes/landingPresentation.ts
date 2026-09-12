import {Router} from 'express'
import {requireAdmin} from '../middleware/auth.js'
import {dbGet,dbRun} from '../db.js'
const router=Router()
router.get('/',(_req,res)=>{res.set('Cache-Control','no-store');res.json(JSON.parse(dbGet<{value:string}>('SELECT value FROM site_settings WHERE key = ?',['landing_presentation'])?.value??'{}'))})
router.put('/',requireAdmin,(req,res)=>{
 const input=req.body
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>300){res.sendStatus(400);return}
 const result:Record<string,unknown>={}
 for(const [key,value] of Object.entries(input)){
 const v=value as {count?:number;width?:string;align?:string;titleTr?:string;titleEn?:string;bodyTr?:string;bodyEn?:string;removed?:boolean;size?:string;cardSize?:string;mobile?:string}
 if(key.length>150||!v||![3,4,6,8,9,12,16,20].includes(v.count as number)||!['normal','wide'].includes(v.width??'')||!['left','center'].includes(v.align??'')){res.status(400).json({error:'Geçersiz görünüm ayarı.'});return}
 if (['titleTr','titleEn','bodyTr','bodyEn'].some(field=>{const val=(v as Record<string,unknown>)[field];return val!==undefined&&(typeof val!=='string'||val.length>20000)}) || (v.size!==undefined&&!['compact','normal','large'].includes(v.size)) || (v.cardSize!==undefined&&!['normal','large'].includes(v.cardSize)) || (v.mobile!==undefined&&!['single','double'].includes(v.mobile)) || (v.removed!==undefined&&typeof v.removed!=='boolean')){res.sendStatus(400);return}
 result[key]={count:v.count,width:v.width,align:v.align,...(v.size?{size:v.size}:{}),...(v.cardSize?{cardSize:v.cardSize}:{}),...(v.mobile?{mobile:v.mobile}:{}),...(v.removed!==undefined?{removed:v.removed}:{}),...Object.fromEntries(['titleTr','titleEn','bodyTr','bodyEn'].filter(field=>(v as Record<string,unknown>)[field]!==undefined).map(field=>[field,(v as Record<string,unknown>)[field]]))}
 }
 dbRun('INSERT OR REPLACE INTO site_settings (key,value) VALUES (?,?)',['landing_presentation',JSON.stringify(result)]);res.json(result)
})
export default router
