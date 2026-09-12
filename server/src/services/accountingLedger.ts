import { createHmac, randomUUID } from 'node:crypto'
import { dbAll, dbGet, dbRun, dbRunNoPersist, dbTransaction, dbExec } from '../db.js'
import { isIP } from 'node:net'
import { config } from '../config.js'
import { getIstanbulMonthKey } from './dailyWatchLimits.js'
import type {
  AccountingRules,
  AccountingReport,
  AccountingItem,
  AccountingFinance,
  AccountingCreatorRow,
  OwnerGroup,
  PayoutDetails,
  ExpenseItem,
  RevenueByPlan,
} from '../../../shared/accounting.js'
import { getBillingPlan } from './billingPlansConfig.js'

let initialized = false
const defaults: AccountingRules = { threshold: 20, basis: 'views', pools: [
  { id: 'film', label: 'Bağımsız yapımcı · Film', rate: 30 },
  { id: 'dizi', label: 'Dizi', rate: 0 },
  { id: 'stand-up', label: 'Stand-up', rate: 0 },
  { id: 'kisa-film', label: 'Kısa film', rate: 5 },
  { id: 'belgesel', label: 'Belgesel', rate: 10 },
  { id: 'vertical', label: 'Dikey dizi', rate: 0 },
  { id: 'student_cinema', label: 'Genç Sinema', rate: 5 },
] }
export function accountingClientIp(req: {ip?:string;socket:{remoteAddress?:string}}) {
  const peer=(req.socket.remoteAddress??'').replace(/^::ffff:/,'')
  const privatePeer=peer==='::1'||peer.startsWith('127.')||peer.startsWith('10.')||peer.startsWith('192.168.')||/^172\.(1[6-9]|2[0-9]|3[01])\./.test(peer)
  const forwarded=(req.ip??'').replace(/^::ffff:/,'')
  return privatePeer && isIP(forwarded)?forwarded:peer||'unknown'
}
export const WINDOW_MS = 48 * 60 * 60 * 1000
/** Aynı internet bağlantısından (ev, yurt, ofis) 48 saatte aynı içerik için sayılan en fazla farklı hesap. */
export const IP_ACCOUNT_LIMIT = 3
const MAX_MONEY = 1_000_000_000

function addColumn(table: string, column: string, definition: string) {
  const exists = dbAll<{ name: string }>(`PRAGMA table_info(${table})`).some((row) => row.name === column)
  if (!exists) dbExec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

export function initAccounting() {
  if (initialized) return
  dbExec("CREATE TABLE IF NOT EXISTS accounting_rules (id INTEGER PRIMARY KEY, json TEXT NOT NULL, started_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS accounting_months (month TEXT PRIMARY KEY, rules TEXT NOT NULL, snapshot TEXT, closed_at TEXT); CREATE TABLE IF NOT EXISTS accounting_views (id TEXT PRIMARY KEY, content_id TEXT NOT NULL, episode_id TEXT NOT NULL, user_id TEXT NOT NULL, ip_hash TEXT NOT NULL, started_at INTEGER NOT NULL, month TEXT NOT NULL, seconds REAL NOT NULL DEFAULT 0, duration REAL NOT NULL, threshold REAL NOT NULL, qualified INTEGER NOT NULL DEFAULT 0, intervals TEXT NOT NULL DEFAULT '[]', metadata TEXT NOT NULL); CREATE INDEX IF NOT EXISTS av_user ON accounting_views(content_id, episode_id, user_id, started_at); CREATE INDEX IF NOT EXISTS av_ip ON accounting_views(content_id, episode_id, ip_hash, started_at); CREATE INDEX IF NOT EXISTS av_month ON accounting_views(month); CREATE TABLE IF NOT EXISTS accounting_cursor (user_id TEXT NOT NULL, content_id TEXT NOT NULL, episode_id TEXT NOT NULL, position REAL NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(user_id,content_id,episode_id)); CREATE TABLE IF NOT EXISTS accounting_payments (month TEXT NOT NULL, creator_id TEXT NOT NULL, paid_at TEXT NOT NULL, reference TEXT NOT NULL, admin_id TEXT NOT NULL, PRIMARY KEY(month,creator_id))")
  // Para katmanı: ay başına gider/kesinti ve elle net; ödeme satırına tutar + IBAN anlık görüntüsü.
  addColumn('accounting_months', 'expenses', 'REAL NOT NULL DEFAULT 0')
  addColumn('accounting_months', 'expense_note', "TEXT NOT NULL DEFAULT ''")
  addColumn('accounting_months', 'net_override', 'REAL')
  addColumn('accounting_months', 'finance_updated_at', 'TEXT')
  addColumn('accounting_months', 'expense_items', "TEXT NOT NULL DEFAULT '[]'")
  addColumn('accounting_payments', 'amount', 'REAL')
  addColumn('accounting_payments', 'iban', "TEXT NOT NULL DEFAULT ''")
  addColumn('accounting_payments', 'holder', "TEXT NOT NULL DEFAULT ''")
  dbRun('INSERT OR IGNORE INTO accounting_rules(id,json,started_at) VALUES (1,?,?)', [JSON.stringify(defaults), new Date().toISOString()])
  initialized = true
}
export function getAccountingRules(): AccountingRules {
  initAccounting()
  return JSON.parse(dbGet<{json:string}>('SELECT json FROM accounting_rules WHERE id=1')!.json)
}
export function validateRules(value: AccountingRules) {
  if (!value || !Number.isFinite(value.threshold) || value.threshold < 1 || value.threshold > 100 || !['views','minutes'].includes(value.basis) || !Array.isArray(value.pools) || value.pools.length > 100) throw new Error('Geçersiz oran veya eşik.')
  const ids = new Set<string>()
  for (const p of value.pools) {
    if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id) || ids.has(p.id) || typeof p.label !== 'string' || !p.label.trim() || p.label.length>150 || !Number.isFinite(p.rate) || p.rate<0 || p.rate>100 || Math.abs(p.rate*100-Math.round(p.rate*100))>0.000001) throw new Error('Kategori oranları 0–100 arasında, en fazla iki ondalık olmalı.')
    if (p.categoryId && !dbGet('SELECT id FROM categories WHERE id=?',[p.categoryId])) throw new Error('Kategori bulunamadı.')
    ids.add(p.id)
  }
  if (defaults.pools.some(p=>!ids.has(p.id))) throw new Error('Temel türler silinemez; payını sıfırlayabilirsiniz.')
  if (value.pools.reduce((s,p)=>s+Math.round(p.rate*100),0)>10000) throw new Error('Payların toplamı %100 üzerinde olamaz.')
}
export function saveAccountingRules(value: AccountingRules) {
  initAccounting(); validateRules(value); rolloverAccounting()
  dbTransaction(()=>{
    dbRunNoPersist('UPDATE accounting_rules SET json=? WHERE id=1',[JSON.stringify(value)])
    dbRunNoPersist('UPDATE accounting_months SET rules=? WHERE month=? AND snapshot IS NULL',[JSON.stringify(value),getIstanbulMonthKey()])
  })
  return getAccountingRules()
}
type ViewRow = { id:string; user_id:string; ip_hash:string; started_at:number; seconds:number; duration:number; threshold:number; qualified:number; intervals:string; metadata:string }
type Meta = { contentId:string; title:string; type:string; program:OwnerGroup; creatorId:string|null; creatorName:string; categoryIds:string[]; vertical:boolean }
export function recordAccountingProgress(input: {userId:string; contentId:string; episodeId:string; ip:string; position:number; duration:number; now?:number}) {
  initAccounting()
  const now=input.now ?? Date.now(), {userId,contentId,episodeId,position,duration}=input
  if (!Number.isFinite(position) || position<0 || !Number.isFinite(duration) || duration<=0 || position>duration+2) throw new Error('Geçersiz izleme süresi.')
  if(!dbGet('SELECT month FROM accounting_months WHERE month=?',[getIstanbulMonthKey(new Date(now))])) rolloverAccounting(new Date(now))
  const c=dbGet<{id:string;title:string;type:string;program:string;creator_id:string|null;creator_name:string|null;video_format:string;duration_minutes:number|null}>('SELECT c.*,u.name AS creator_name FROM content c LEFT JOIN creators cr ON cr.id=c.creator_id LEFT JOIN users u ON u.id=cr.user_id WHERE c.id=?',[contentId])
  if (!c) throw new Error('İçerik bulunamadı.')
  if(episodeId && !dbGet('SELECT id FROM episodes WHERE id=? AND content_id=?',[episodeId,contentId])) throw new Error('Bölüm bu içeriğe ait değil.')
  const canonicalDuration=!episodeId && c.duration_minutes && c.duration_minutes>0 ? c.duration_minutes*60 : duration
  const old=dbGet<{position:number;at:number}>('SELECT position,at FROM accounting_cursor WHERE user_id=? AND content_id=? AND episode_id=?',[userId,contentId,episodeId])
  // First heartbeat establishes position; seeking does not earn time.
  const elapsed=old ? Math.max(0,(now-old.at)/1000) : 0
  const movement=old ? position-old.position : 0
  const delta=old && elapsed<=90 && movement>0 && movement<=elapsed*2+2 ? Math.min(movement,elapsed*2,30) : 0
  const ipHash=createHmac('sha256',config.jwtSecret).update(input.ip.replace(/^::ffff:/,'')).digest('hex')
  let counted=false
  let qualified=false
  let creditedSeconds=0
  dbTransaction(()=>{
    dbRunNoPersist('INSERT INTO accounting_cursor(user_id,content_id,episode_id,position,at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,content_id,episode_id) DO UPDATE SET position=excluded.position,at=excluded.at',[userId,contentId,episodeId,position,now])
    if(delta<=0) return
    const candidates=dbAll<ViewRow>('SELECT * FROM accounting_views WHERE content_id=? AND episode_id=? AND started_at>? AND (user_id=? OR ip_hash=?) ORDER BY started_at DESC',[contentId,episodeId,now-WINDOW_MS,userId,ipHash])
    // Aynı üye 48 saat içinde hangi ağdan devam ederse etsin tek olayda birleşir (ev → mobil geçişi süre kaybettirmez).
    let event=candidates.find(v=>v.user_id===userId)
    if(!event) {
      // Farklı hesaplar aynı bağlantıdan: ev/yurt için makul sayıya kadar sayılır, ötesi sayılmaz.
      const accountsOnIp=new Set(candidates.filter(v=>v.ip_hash===ipHash).map(v=>v.user_id)).size
      if(accountsOnIp>=IP_ACCOUNT_LIMIT) return
      const rules=getAccountingRules()
      const meta:Meta={contentId,title:c.title,type:c.type,program:c.program==='student_cinema'?'student_cinema':c.creator_id && c.program!=='platform'?'standard':'platform',creatorId:c.creator_id,creatorName:c.creator_name ?? 'Plooy',categoryIds:dbAll<{category_id:string}>('SELECT category_id FROM category_items WHERE content_id=?',[contentId]).map(r=>r.category_id),vertical:c.video_format==='vertical'}
      event={id:randomUUID(),user_id:userId,ip_hash:ipHash,started_at:now,seconds:0,duration:canonicalDuration,threshold:rules.threshold,qualified:0,intervals:'[]',metadata:JSON.stringify(meta)}
      dbRunNoPersist('INSERT INTO accounting_views(id,content_id,episode_id,user_id,ip_hash,started_at,month,duration,threshold,metadata) VALUES(?,?,?,?,?,?,?,?,?,?)',[event.id,contentId,episodeId,userId,ipHash,now,getIstanbulMonthKey(new Date(now)),canonicalDuration,rules.threshold,event.metadata])
      counted=true
    }
    // Keep unique watched ranges so replaying the same few seconds cannot qualify a film.
    const ranges: number[][]=JSON.parse(event.intervals)
    ranges.push([Math.max(0,position-delta),Math.min(event.duration,position)])
    ranges.sort((a,b)=>a[0]-b[0])
    const merged:number[][]=[]
    for(const range of ranges) { if(range[1]<=range[0]) continue; const last=merged.at(-1); if(last && range[0]<=last[1]) last[1]=Math.max(last[1],range[1]); else merged.push(range) }
    const seconds=Math.min(event.duration,merged.reduce((sum,r)=>sum+r[1]-r[0],0))
    qualified=seconds/event.duration>=event.threshold/100
    // A closed month is immutable, even when a 48h window spans midnight.
    if(dbGet<{snapshot:string|null}>('SELECT snapshot FROM accounting_months WHERE month=?',[getIstanbulMonthKey(new Date(event.started_at))])?.snapshot) return
    creditedSeconds=Math.max(0,seconds-event.seconds)
    dbRunNoPersist('UPDATE accounting_views SET seconds=?,qualified=?,intervals=? WHERE id=?',[seconds,qualified?1:0,JSON.stringify(merged),event.id])
  })
  return { counted,qualified,creditedSeconds }
}
function poolFor(meta:Meta,rules:AccountingRules) {
  if(meta.program==='platform') return 'platform'
  if(meta.program==='student_cinema') return 'student_cinema'
  return rules.pools.find(p=>p.categoryId && meta.categoryIds.includes(p.categoryId))?.id ?? (meta.vertical?'vertical':meta.type)
}
export function poolLabel(poolId:string,rules:AccountingRules) {
  return rules.pools.find(p=>p.id===poolId)?.label ?? 'Plooy'
}
const emptyPayout:PayoutDetails={holder:'',iban:'',taxId:'',taxOffice:''}
const emptyFinance:AccountingFinance={grossRevenue:0,paidOrders:0,revenueByPlan:[],activeSubscribers:0,expenseItems:[],expenses:0,expenseNote:'',netOverride:null,distributable:0,updatedAt:null,locked:false}
const MAX_EXPENSE_ITEMS=40
function round2(value:number) { return Math.round(value*100)/100 }

function buildMonth(month:string,rules:AccountingRules):AccountingReport {
  const entries=dbAll<{seconds:number;qualified:number;threshold:number;metadata:string}>('SELECT seconds,qualified,threshold,metadata FROM accounting_views WHERE month=?',[month])
  const map=new Map<string,AccountingItem>()
  const totals=new Map<string,number>()
  for(const e of entries) {
    const m:Meta=JSON.parse(e.metadata), pool=poolFor(m,rules)
    const key=m.contentId+'|'+m.creatorId+'|'+m.program+'|'+pool
    let item=map.get(key)
    if(!item) { item={contentId:m.contentId,title:m.title,type:m.type,program:m.program,creatorId:m.creatorId,creatorName:m.creatorName,views:0,qualifiedViews:0,watchSeconds:0,qualifiedSeconds:0,pool,poolShare:0,profitShare:0}; map.set(key,item) }
    item.views++; item.watchSeconds+=e.seconds
    if(e.qualified) { item.qualifiedViews++; item.qualifiedSeconds+=e.seconds }
  }
  for(const item of map.values()) if(item.creatorId && item.program!=='platform') totals.set(item.pool,(totals.get(item.pool)??0)+(rules.basis==='views'?item.qualifiedViews:item.qualifiedSeconds))
  for(const item of map.values()) {
    const total=totals.get(item.pool)??0, weight=rules.basis==='views'?item.qualifiedViews:item.qualifiedSeconds
    if(total>0 && item.creatorId && item.program!=='platform') {
      item.poolShare=weight/total*100
      item.profitShare=(rules.pools.find(p=>p.id===item.pool)?.rate??0)*weight/total
    }
  }
  const creators=new Map<string,AccountingCreatorRow>()
  for(const item of map.values()) if(item.creatorId && item.program!=='platform') {
    const c=creators.get(item.creatorId)??{id:item.creatorId,name:item.creatorName,share:0,views:0,amount:0,paidAt:null,reference:'',paidAmount:null,paidIban:'',payout:{...emptyPayout}}
    c.share+=item.profitShare; c.views+=item.views; creators.set(c.id,c)
  }
  return {month,closedAt:null,rules,startedAt:dbGet<{started_at:string}>('SELECT started_at FROM accounting_rules WHERE id=1')!.started_at,items:[...map.values()].sort((a,b)=>b.views-a.views || a.title.localeCompare(b.title)),creators:[...creators.values()].sort((a,b)=>b.share-a.share),platformShare:Math.max(0,100-[...creators.values()].reduce((s,c)=>s+c.share,0)),thresholds:[...new Set(entries.map(e=>e.threshold))].sort((a,b)=>a-b),finance:{...emptyFinance}}
}
export function rolloverAccounting(now=new Date()) {
  initAccounting()
  const current=getIstanbulMonthKey(now)
  for(const row of dbAll<{month:string;rules:string}>('SELECT month,rules FROM accounting_months WHERE month<? AND snapshot IS NULL ORDER BY month',[current])) {
    const report=buildMonth(row.month,JSON.parse(row.rules)); report.closedAt=now.toISOString()
    dbRun('UPDATE accounting_months SET snapshot=?,closed_at=? WHERE month=? AND snapshot IS NULL',[JSON.stringify(report),report.closedAt,row.month])
  }
  dbRun('INSERT OR IGNORE INTO accounting_months(month,rules) VALUES(?,?)',[current,JSON.stringify(getAccountingRules())])
}
export function listNewAccountingMonths() { rolloverAccounting(); return dbAll<{month:string;closed_at:string|null}>('SELECT month,closed_at FROM accounting_months ORDER BY month DESC') }

/** Ayın brüt tahsilatı: başarıyla ödenen abonelik siparişleri (kuruş → TL), İstanbul takvim ayına göre; plan bazında döküm. */
export function monthGrossRevenue(month:string) {
  const [year,mon]=month.split('-').map(Number)
  const from=new Date(Date.UTC(year,mon-1,1)-2*86_400_000).toISOString()
  const to=new Date(Date.UTC(year,mon,1)+2*86_400_000).toISOString()
  const rows=dbAll<{amount:number;completed_at:string;plan_id:string}>("SELECT amount, completed_at, plan_id FROM payment_orders WHERE status='paid' AND completed_at IS NOT NULL AND completed_at>=? AND completed_at<?",[from,to])
    .filter((row)=>getIstanbulMonthKey(new Date(row.completed_at))===month)
  const byPlan=new Map<string,RevenueByPlan>()
  let kurus=0
  for(const row of rows) {
    const amount=Number(row.amount)||0
    kurus+=amount
    const entry=byPlan.get(row.plan_id)??{planId:row.plan_id,planName:getBillingPlan(row.plan_id)?.name??row.plan_id,count:0,amount:0}
    entry.count++; entry.amount=round2(entry.amount+amount/100); byPlan.set(row.plan_id,entry)
  }
  return { grossRevenue:round2(kurus/100), paidOrders:rows.length, revenueByPlan:[...byPlan.values()].sort((a,b)=>b.amount-a.amount) }
}
function activeSubscriberCount() {
  const now=new Date().toISOString()
  return dbGet<{count:number}>("SELECT COUNT(*) AS count FROM users WHERE subscription_status IN ('active','cancelled') AND (subscription_expires_at IS NULL OR subscription_expires_at > ?)",[now])?.count??0
}
/** "1.250,50", "1250.50", 1250.5 → 1250.5; geçersizse NaN. */
function parseMoney(raw:unknown) {
  if(typeof raw==='number') return raw
  let s=String(raw??'').trim().replace(/\s|₺|TL/gi,'')
  if(!s) return 0
  if(s.includes(',')&&s.includes('.')) s=s.replace(/\./g,'').replace(',','.')
  else if(s.includes(',')) s=s.replace(',','.')
  else if((s.match(/\./g)??[]).length>1) s=s.replace(/\./g,'')
  return Number(s)
}
function parseExpenseItems(raw:string|null|undefined):ExpenseItem[] {
  try {
    const parsed=JSON.parse(raw||'[]')
    return Array.isArray(parsed)?parsed.filter((i)=>i&&typeof i.label==='string').map((i)=>({id:String(i.id),label:String(i.label),amount:round2(Number(i.amount)||0)})):[]
  } catch { return [] }
}
export function getAccountingFinance(month:string):AccountingFinance {
  initAccounting()
  const row=dbGet<{expenses:number;expense_note:string;net_override:number|null;finance_updated_at:string|null;expense_items:string}>('SELECT expenses,expense_note,net_override,finance_updated_at,expense_items FROM accounting_months WHERE month=?',[month])
  const gross=monthGrossRevenue(month)
  const expenseItems=parseExpenseItems(row?.expense_items)
  // Kalem varsa toplam kalemlerden; eski tek tutar kayıtları kalem yoksa korunur.
  const expenses=round2(expenseItems.length?expenseItems.reduce((s,i)=>s+i.amount,0):Number(row?.expenses)||0)
  const netOverride=row?.net_override===null||row?.net_override===undefined?null:round2(Number(row.net_override))
  const locked=Boolean(dbGet('SELECT 1 FROM accounting_payments WHERE month=? LIMIT 1',[month]))
  return { ...gross, activeSubscribers:activeSubscriberCount(), expenseItems, expenses, expenseNote:row?.expense_note??'', netOverride, distributable:round2(Math.max(0,netOverride??gross.grossRevenue-expenses)), updatedAt:row?.finance_updated_at??null, locked }
}
export function saveAccountingFinance(month:string,input:{expenseItems?:unknown;expenses?:unknown;expenseNote?:unknown;netOverride?:unknown}) {
  rolloverAccounting()
  if(!dbGet('SELECT month FROM accounting_months WHERE month=?',[month])) throw new Error('Bu ay için muhasebe kaydı yok.')
  if(getAccountingFinance(month).locked) throw new Error('Bu ay için ödeme kaydı var; giderleri değiştirmek için önce ödemeleri geri alın.')
  const note=String(input.expenseNote??'').trim()
  if(note.length>500) throw new Error('Not en fazla 500 karakter olabilir.')
  let items:ExpenseItem[]=[]
  if(Array.isArray(input.expenseItems)) {
    if(input.expenseItems.length>MAX_EXPENSE_ITEMS) throw new Error(`En fazla ${MAX_EXPENSE_ITEMS} gider kalemi girilebilir.`)
    items=input.expenseItems.map((raw,index)=>{
      const item=(raw??{}) as Record<string,unknown>
      const label=String(item.label??'').trim()
      const amount=parseMoney(item.amount)
      if(!label||label.length>80) throw new Error(`${index+1}. gider kaleminin adı 1–80 karakter olmalı.`)
      if(!Number.isFinite(amount)||amount<0||amount>MAX_MONEY) throw new Error(`"${label}" için tutar 0 veya daha büyük bir sayı olmalı.`)
      return { id:typeof item.id==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(item.id)?item.id:randomUUID(), label, amount:round2(amount) }
    })
  }
  const total=round2(items.reduce((s,i)=>s+i.amount,0))
  let expenses=total
  if(!items.length && input.expenses!==undefined) {
    expenses=Number(input.expenses??0)
    if(!Number.isFinite(expenses)||expenses<0||expenses>MAX_MONEY) throw new Error('Gider tutarı 0 veya daha büyük bir sayı olmalı.')
  }
  // Elle net artık kullanılmıyor: dağıtılacak net = tahsilat − giderler.
  dbRun('UPDATE accounting_months SET expenses=?,expense_note=?,net_override=NULL,expense_items=?,finance_updated_at=? WHERE month=?',[round2(expenses),note,JSON.stringify(items),new Date().toISOString(),month])
  return getAccountingReport(month)
}
function creatorPayout(creatorId:string):PayoutDetails {
  const row=dbGet<{payout_holder:string|null;payout_iban:string|null;payout_tax_id:string|null;payout_tax_office:string|null}>('SELECT payout_holder,payout_iban,payout_tax_id,payout_tax_office FROM creators WHERE id=?',[creatorId])
  return { holder:row?.payout_holder??'', iban:row?.payout_iban??'', taxId:row?.payout_tax_id??'', taxOffice:row?.payout_tax_office??'' }
}
export function getAccountingReport(month:string):AccountingReport {
  rolloverAccounting()
  const row=dbGet<{rules:string;snapshot:string|null}>('SELECT rules,snapshot FROM accounting_months WHERE month=?',[month])
  if(!row) throw new Error('Bu ay için yeni muhasebe kaydı yok.')
  const report:AccountingReport=row.snapshot?JSON.parse(row.snapshot):buildMonth(month,JSON.parse(row.rules))
  const finance=getAccountingFinance(month)
  const payments=dbAll<{creator_id:string;paid_at:string;reference:string;amount:number|null;iban:string|null}>('SELECT creator_id,paid_at,reference,amount,iban FROM accounting_payments WHERE month=?',[month])
  report.finance=finance
  report.creators=report.creators.map((c)=>{
    const p=payments.find(p=>p.creator_id===c.id)
    return {
      ...c,
      amount:round2(finance.distributable*c.share/100),
      paidAt:p?.paid_at??null,
      reference:p?.reference??'',
      paidAmount:p?.amount===null||p?.amount===undefined?null:round2(Number(p.amount)),
      paidIban:p?.iban??'',
      payout:creatorPayout(c.id),
    }
  })
  return report
}
export function markAccountingPaid(month:string,creatorId:string,reference:string,adminId:string) {
  const report=getAccountingReport(month)
  if(!report.closedAt) throw new Error('Ödeme kaydı yalnızca arşivlenen aya eklenebilir.')
  const creator=report.creators.find(c=>c.id===creatorId && c.share>0)
  if(!creator) throw new Error('Ödenecek yapımcı payı bulunamadı.')
  if(typeof reference!=='string' || !reference.trim() || reference.length>300) throw new Error('Ödeme açıklaması veya dekont referansı gerekli (en fazla 300 karakter).')
  dbRun('INSERT OR IGNORE INTO accounting_payments(month,creator_id,paid_at,reference,admin_id,amount,iban,holder) VALUES(?,?,?,?,?,?,?,?)',[month,creatorId,new Date().toISOString(),reference.trim(),adminId,creator.amount,creator.payout.iban,creator.payout.holder])
  return getAccountingReport(month)
}
/** Yanlış işaretlenen ödemeyi geri alır; yalnızca kayıt silinir, para hareketi yoktur. */
export function undoAccountingPaid(month:string,creatorId:string) {
  initAccounting()
  if(!dbGet('SELECT 1 FROM accounting_payments WHERE month=? AND creator_id=?',[month,creatorId])) throw new Error('Bu ay için ödeme kaydı bulunamadı.')
  dbRun('DELETE FROM accounting_payments WHERE month=? AND creator_id=?',[month,creatorId])
  return getAccountingReport(month)
}

/** Yapımcı sözleşmesine eklenen, panel ayarlarından otomatik üretilen "güncel oranlar" bölümü. */
export function describeAccountingRules(lang:'tr'|'en'='tr') {
  const rules=getAccountingRules()
  const creatorTotal=rules.pools.reduce((s,p)=>s+p.rate,0)
  const pct=(n:number)=>'%'+n.toLocaleString(lang==='en'?'en-GB':'tr-TR',{maximumFractionDigits:2})
  const pools=rules.pools.map(p=>`${p.label}: ${pct(p.rate)}`).join(', ')
  if(lang==='en') {
    return {
      heading:'Current revenue share (generated from platform settings)',
      body:[
        `This section is generated automatically from the current settings in the Plooy admin panel and applies to the open accounting month.`,
        `Qualified view: a view counts once at least ${pct(rules.threshold)} of the runtime has been watched as unique footage. Seeking forward and replaying the same section do not add time.`,
        `Counting rule: the same member is counted once per title (per episode for series) in any 48-hour window regardless of network. At most ${IP_ACCOUNT_LIMIT} different accounts are counted from the same internet connection.`,
        `Distribution basis: ${rules.basis==='views'?'number of qualified views':'qualified minutes watched'}.`,
        `Pool shares of the distributable net profit: ${pools}. The remaining ${pct(Math.max(0,100-creatorTotal))} belongs to Plooy. A pool with no qualified views in a month stays with Plooy.`,
        `Within each pool the share is split proportionally among that month's titles. Period: calendar month (Europe/Istanbul). When a month closes, its views and rates are locked and the creator panel shows the share and amount for that month.`,
        `Payment: made by bank transfer to the IBAN the creator provides in the panel. Plooy does not move money inside the platform; the admin marks a transfer as paid and the receipt reference becomes visible to the creator.`,
      ].join('\n\n'),
    }
  }
  return {
    heading:'Güncel gelir paylaşım oranları (panel ayarlarından otomatik üretilir)',
    body:[
      `Bu bölüm Plooy yönetim panelindeki güncel ayarlardan otomatik üretilir ve açık muhasebe ayı için geçerlidir.`,
      `Nitelikli izlenme: içerik süresinin en az ${pct(rules.threshold)}'i benzersiz olarak izlendiğinde izlenme nitelikli sayılır. İleri sarma ve aynı bölümü tekrar izleme süre kazandırmaz.`,
      `Sayım kuralı: aynı üye aynı içerik için (dizilerde bölüm başına) 48 saatte bir kez sayılır; hangi ağdan izlediği fark etmez. Aynı internet bağlantısından en fazla ${IP_ACCOUNT_LIMIT} farklı hesap sayılır.`,
      `Dağıtım ölçüsü: ${rules.basis==='views'?'nitelikli izlenme sayısı':'nitelikli izlenen dakika'}.`,
      `Dağıtılabilir net kârdan havuz payları: ${pools}. Kalan ${pct(Math.max(0,100-creatorTotal))} Plooy'a aittir. O ay nitelikli izlenmesi olmayan havuzun payı Plooy'da kalır.`,
      `Her havuzun payı, o ayki içerikler arasında ölçüye göre orantılı paylaştırılır. Dönem takvim ayıdır (Europe/Istanbul). Ay kapanınca izlenmeler ve oranlar kilitlenir; yapımcı paneli o ayın payını ve tutarını gösterir.`,
      `Ödeme: yapımcının panelde bildirdiği IBAN'a banka havalesi ile yapılır. Plooy platform içinde para transferi yapmaz; yönetici havaleyi "ödendi" olarak işaretler ve dekont referansı yapımcıya görünür.`,
    ].join('\n\n'),
  }
}
