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
 const v=value as {count?:number;width?:string;align?:string}
 if(key.length>150||!v||![3,6,9].includes(v.count as number)||!['normal','wide'].includes(v.width??'')||!['left','center'].includes(v.align??'')){res.status(400).json({error:'Geçersiz görünüm ayarı.'});return}
 result[key]={count:v.count,width:v.width,align:v.align}
 }
 dbRun('INSERT OR REPLACE INTO site_settings (key,value) VALUES (?,?)',['landing_presentation',JSON.stringify(result)]);res.json(result)
})
export default router
