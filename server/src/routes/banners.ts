import {Router} from 'express'
import {randomUUID} from 'node:crypto'
import {dbAll,dbGet,dbRun} from '../db.js'
import {requireAdmin,optionalAuth,type AuthRequest} from '../middleware/auth.js'
import type {Banner} from '../../../src/types/banner.js'
const router=Router()
function init(){dbRun('CREATE TABLE IF NOT EXISTS page_banners (id TEXT PRIMARY KEY, config TEXT NOT NULL)');dbRun('CREATE TABLE IF NOT EXISTS banner_events (banner_id TEXT NOT NULL, session_id TEXT NOT NULL, kind TEXT NOT NULL, PRIMARY KEY(banner_id,session_id,kind))')}
function list(stats=true):Banner[]{init();return dbAll<{id:string;config:string}>('SELECT * FROM page_banners ORDER BY rowid DESC').map(row=>({...JSON.parse(row.config),id:row.id,views:stats?dbGet<{n:number}>("SELECT COUNT(*) n FROM banner_events WHERE banner_id=? AND kind='view'",[row.id])?.n??0:0,clicks:stats?dbGet<{n:number}>("SELECT COUNT(*) n FROM banner_events WHERE banner_id=? AND kind='click'",[row.id])?.n??0:0}))}
function visible(b:Banner,member:boolean){const now=Date.now();return b.active&&(!b.startsAt||Date.parse(b.startsAt)<=now)&&(!b.endsAt||Date.parse(b.endsAt)>=now)&&(b.audience==='all'||b.audience===(member?'member':'guest'))}
function safeUrl(s:string){return !s||(/^https?:\/\//i.test(s)&&(()=>{try{return Boolean(new URL(s).hostname)}catch{return false}})())||(/^\/(?![\/\\])/.test(s)&&!s.includes('\\'))}
function parse(input:Record<string,unknown>){const b={...input} as unknown as Banner;for(const key of ['name','titleTr','titleEn','bodyTr','bodyEn','imageUrl','link','startsAt','endsAt'] as const){if(typeof b[key]!=='string'||b[key].length>20000)throw Error('Metin alanlarını kontrol edin.')}
if(!b.name.trim()||!b.imageUrl||!safeUrl(b.imageUrl)||!safeUrl(b.link))throw Error('Ad, görsel ve geçerli bağlantı gerekli.')
if(!['all','guest','member'].includes(b.audience)||!['top','bottom'].includes(b.placement)||!['small','medium','large'].includes(b.size)||typeof b.active!=='boolean')throw Error('Gösterim ayarları geçersiz.')
if([b.startsAt,b.endsAt].some(d=>d&&!Number.isFinite(Date.parse(d)))||(b.startsAt&&b.endsAt&&Date.parse(b.startsAt)>=Date.parse(b.endsAt)))throw Error('Bitiş tarihi başlangıçtan sonra olmalı.')
return Object.fromEntries(['name','titleTr','titleEn','bodyTr','bodyEn','imageUrl','link','startsAt','endsAt','audience','placement','size','active'].map(k=>[k,input[k]]))}
router.get('/manage',requireAdmin,(_req,res)=>res.json(list()))
router.post('/manage',requireAdmin,(req,res)=>{try{init();const value=parse(req.body);const id=randomUUID();dbRun('INSERT INTO page_banners (id,config) VALUES (?,?)',[id,JSON.stringify(value)]);res.status(201).json({id})}catch(e){res.status(400).json({error:(e as Error).message})}})
router.put('/manage/:id',requireAdmin,(req,res)=>{try{init();const value=parse(req.body);if(!dbGet('SELECT id FROM page_banners WHERE id=?',[String(req.params.id)])){res.sendStatus(404);return}dbRun('UPDATE page_banners SET config=? WHERE id=?',[JSON.stringify(value),String(req.params.id)]);res.json({ok:true})}catch(e){res.status(400).json({error:(e as Error).message})}})
router.delete('/manage/:id',requireAdmin,(req,res)=>{init();dbRun('DELETE FROM page_banners WHERE id=?',[String(req.params.id)]);dbRun('DELETE FROM banner_events WHERE banner_id=?',[String(req.params.id)]);res.json({ok:true})})
router.get('/',optionalAuth,(req:AuthRequest,res)=>{res.set('Cache-Control','no-store');res.json(list(false).filter(b=>visible(b,Boolean(req.auth))).map(({views,clicks,...b})=>b))})
router.post('/:id/events',optionalAuth,(req:AuthRequest,res)=>{const {sessionId,kind}=req.body??{};if(typeof sessionId!=='string'||! /^[a-zA-Z0-9-]{20,64}$/.test(sessionId)||!['view','click'].includes(kind)){res.sendStatus(400);return}const b=list(false).find(b=>b.id===req.params.id);if(!b||!visible(b,Boolean(req.auth))){res.sendStatus(404);return}dbRun('INSERT OR IGNORE INTO banner_events (banner_id,session_id,kind) VALUES (?,?,?)',[b.id,sessionId,kind]);res.sendStatus(204)})
export default router
