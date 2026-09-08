import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'plooy-accounting-'))
process.env.DATA_DIR=path.join(temp,'data');process.env.UPLOADS_DIR=path.join(temp,'uploads');process.env.NODE_ENV='test'
const {initDatabase,dbRun,dbGet}=await import('../src/db.ts')
await initDatabase()
const RealDate=Date
let clock=new RealDate('2026-09-08T09:00:00Z').getTime()
global.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[clock]))}static now(){return clock}}
const {getAccountingRules,saveAccountingRules,recordAccountingProgress,getAccountingReport,rolloverAccounting,markAccountingPaid,WINDOW_MS,accountingClientIp}=await import('../src/services/accountingLedger.ts')
const {getContentEngagementStats}=await import('../src/services/studentCinema.ts')
const {default:router}=await import('../src/routes/accountingLedger.ts')
const {default:progressRouter}=await import('../src/routes/watchProgress.ts')
const {signToken}=await import('../src/middleware/auth.ts')
const {default:express}=await import('express')
const app=express();app.use(express.json());app.use('/accounting',router);app.use('/progress',progressRouter)
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r))
const base='http://127.0.0.1:'+server.address().port
for(const id of ['admin','owner','studentOwner','viewer','unpaid']){
 dbRun('INSERT INTO users(id,name,email,password_hash,role,created_at,subscription_status) VALUES(?,?,?,?,?,?,?)',[id,id,id+'@test.invalid','unused',id==='admin'?'admin':id.includes('wner')?'creator':'user',new Date().toISOString(),id==='unpaid'?'none':'active'])
}
for(const id of ['owner','studentOwner'])dbRun('INSERT INTO creators(id,user_id,studio_name,bio,status,created_at,program) VALUES(?,?,?,?,?,?,?)',[id,id,id,'','approved',new Date().toISOString(),id==='owner'?'standard':'student_cinema'])
for(const [id,type,creator,program] of [['a','film','owner','standard'],['a2','film','owner','standard'],['b','kisa-film','owner','standard'],['s','film','studentOwner','student_cinema'],['p','film',null,'standard'],['seek','film','owner','standard'],['replay','film','owner','standard']]){
 dbRun('INSERT INTO content(id,title,description,year,duration,rating,type,genres,poster,backdrop,video_url,creator_id,program,published_at,review_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,'Title '+id,'',2026,'','',type,'[]','','','https://test.invalid/video',creator,program,new Date().toISOString(),'published'])
}
for(const id of ['profile1','profile2'])dbRun('INSERT INTO profiles(id,user_id,name,avatar) VALUES(?,?,?,?)',[id,'viewer',id,''])
dbRun('INSERT INTO profiles(id,user_id,name,avatar) VALUES(?,?,?,?)',['unpaidProfile','unpaid','unpaid',''])
const send=(u,c,ip,pos,t,dur=100)=>recordAccountingProgress({userId:u,contentId:c,episodeId:'',ip,position:pos,duration:dur,now:t})
const count=c=>dbGet('SELECT COUNT(*) n FROM accounting_views WHERE content_id=?',[c]).n
const start=clock
const play=(u,c,ip,t=start)=>{send(u,c,ip,0,t);send(u,c,ip,10,t+10000);return send(u,c,ip,20,t+20000)}
const token=(id)=>signToken({userId:id,role:id==='admin'?'admin':'user'})
const call=(url,id,method='GET',body,profile='profile1')=>fetch(base+url,{method,headers:{Authorization:'Bearer '+token(id),'Content-Type':'application/json','x-profile-id':profile},body:body?JSON.stringify(body):undefined})
try{
 assert.equal(accountingClientIp({ip:'8.8.8.8',socket:{remoteAddress:'203.0.113.5'}}),'203.0.113.5','public direct connection cannot spoof forwarded IP')
 assert.equal(accountingClientIp({ip:'8.8.8.8',socket:{remoteAddress:'172.18.0.1'}}),'8.8.8.8')
 const rules=getAccountingRules();assert.equal(rules.threshold,20)
 for(const bad of [{...rules,threshold:0},{...rules,threshold:101},{...rules,basis:'bad'},{...rules,pools:rules.pools.map(p=>({...p,rate:30}))},{...rules,pools:[...rules.pools,rules.pools[0]]}])assert.throws(()=>saveAccountingRules(bad))
 assert.equal(play('u1','a','1.1.1.1').qualified,true)
 assert.equal(count('a'),1)
 play('u2','a','1.1.1.1');assert.equal(count('a'),1,'same IP blocks second member')
 play('u1','a','2.2.2.2');assert.equal(count('a'),1,'same member blocks changed IP')
 play('u1','b','1.1.1.1');assert.equal(count('b'),1,'different film allowed')
 play('u3','a','3.3.3.3');assert.equal(count('a'),2,'different member and IP allowed')
 play('u4','s','4.4.4.4');play('u5','p','5.5.5.5')
 send('u6','seek','6.6.6.6',0,start);send('u6','seek','6.6.6.6',90,start+10000);assert.equal(count('seek'),0,'seek earns no view')
 send('u6','seek','6.6.6.6',100,start+20000);assert.equal(dbGet("SELECT qualified FROM accounting_views WHERE content_id='seek'").qualified,0)
 send('u7','replay','7.7.7.7',0,start);send('u7','replay','7.7.7.7',10,start+10000);send('u7','replay','7.7.7.7',0,start+20000);send('u7','replay','7.7.7.7',10,start+30000);assert.equal(dbGet("SELECT seconds FROM accounting_views WHERE content_id='replay'").seconds,10,'replayed ranges do not inflate qualified time')
 const acceptedAt=start+10000
 send('u1','a','1.1.1.1',0,acceptedAt+WINDOW_MS-10000)
 send('u1','a','1.1.1.1',10,acceptedAt+WINDOW_MS-1);assert.equal(count('a'),2,'48 hours minus 1ms blocked')
 send('u1','a','1.1.1.1',20,acceptedAt+WINDOW_MS+10000);assert.equal(count('a'),3,'after 48 hours allowed')
 send('u1','b','1.1.1.1',0,acceptedAt+WINDOW_MS-10000);send('u1','b','1.1.1.1',10,acceptedAt+WINDOW_MS);assert.equal(count('b'),2,'exactly 48 hours allowed')
 assert.equal(dbGet("SELECT length(ip_hash) n FROM accounting_views LIMIT 1").n,64)
 assert.throws(()=>send('u','missing','1',0,start))
 assert.throws(()=>send('u','a','1',0,start,NaN))
 play('extra','a2','9.9.9.9');for(let n=3;n<=10;n++)send('extra','a2','9.9.9.9',n*10,start+n*10000)
 let report=getAccountingReport('2026-09');
 assert.ok(Math.abs(report.items.find(i=>i.contentId==='a2').profitShare-10)<1e-8,'views share 1 of 3 qualified views')
 saveAccountingRules({...rules,basis:'minutes'});report=getAccountingReport('2026-09');
 assert.ok(Math.abs(report.items.find(i=>i.contentId==='a2').profitShare-30*100/140)<1e-8,'minutes share uses actual qualified seconds');saveAccountingRules(rules);report=getAccountingReport('2026-09');assert.ok(report.items.some(i=>i.program==='platform'));assert.ok(report.items.some(i=>i.program==='student_cinema'));assert.ok(report.items.some(i=>i.program==='standard'))
 assert.equal(report.items[0].contentId,'a')
 assert.equal(report.items.find(i=>i.contentId==='p').profitShare,0)
 assert.ok(Math.abs(report.platformShare+report.creators.reduce((s,c)=>s+c.share,0)-100)<1e-8)
 assert.throws(()=>markAccountingPaid('2026-09','owner','ref','admin'),/arşiv/)
 dbRun("INSERT INTO categories(id,title,sort_order) VALUES('custom','Custom',1)")
 dbRun("INSERT INTO categories(id,title,sort_order) VALUES('custom2','Custom2',2)")
 dbRun("INSERT INTO category_items(category_id,content_id,sort_order) VALUES('custom','b',0)")
 dbRun("INSERT INTO category_items(category_id,content_id,sort_order) VALUES('custom2','b',0)")
 const updated={...rules,threshold:30,pools:[{id:'custom',label:'Custom',categoryId:'custom',rate:10},{id:'custom2',label:'Custom2',categoryId:'custom2',rate:5},...rules.pools]}
 saveAccountingRules(updated)
 play('u8','b','8.8.8.8');send('u8','b','8.8.8.8',30,start+30000)
 report=getAccountingReport('2026-09')
 assert.equal(report.items.filter(i=>i.pool==='custom').length,1)
 assert.equal(report.items.filter(i=>i.pool==='custom2').length,0,'overlap only pays once')
 assert.equal(report.rules.threshold,30);assert.deepEqual(report.thresholds,[20,30])
 assert.equal(getContentEngagementStats(['a']).get('a').watchCount,3)
 assert.equal((await call('/accounting','viewer')).status,403)
 assert.equal((await call('/accounting','admin')).status,200)
 assert.equal((await call('/accounting/rules','admin','PUT',{...updated,threshold:101})).status,400)
 assert.equal((await call('/progress','viewer','POST',{contentId:'a',position:0,duration:100},'unpaidProfile')).status,400,'profile must belong to account')
 const unpaidBefore=count('a');await call('/progress','unpaid','POST',{contentId:'a',position:20,duration:100},'unpaidProfile');assert.equal(count('a'),unpaidBefore)
 // Real route checks two profiles belonging to one account and trusted socket IP.
 await call('/progress','viewer','POST',{contentId:'a',position:0,duration:100})
 clock+=10000;await call('/progress','viewer','POST',{contentId:'a',position:10,duration:100})
 const beforeProfile=count('a')
 clock+=10000;await call('/progress','viewer','POST',{contentId:'a',position:20,duration:100},'profile2')
 assert.equal(count('a'),beforeProfile)
 // Close month and prove metadata, rules and payments do not recalculate the snapshot.
 clock=new RealDate('2026-09-30T21:00:00Z').getTime();rolloverAccounting()
 const archived=getAccountingReport('2026-09');assert.ok(archived.closedAt)
 const snapshot=JSON.stringify(archived)
 saveAccountingRules({...rules,threshold:50,basis:'minutes'})
 dbRun("UPDATE content SET title='Changed',creator_id=NULL WHERE id='a'")
 assert.equal(JSON.stringify(getAccountingReport('2026-09')),snapshot,'closed report immutable')
 rolloverAccounting();assert.equal(JSON.stringify(getAccountingReport('2026-09')),snapshot,'repeat rollover idempotent')
 assert.equal(getAccountingReport('2026-10').rules.threshold,50)
 const paid=markAccountingPaid('2026-09','owner','Bank ref 1','admin');assert.equal(paid.creators.find(c=>c.id==='owner').reference,'Bank ref 1')
 markAccountingPaid('2026-09','owner','Bank ref 2','admin');assert.equal(dbGet("SELECT COUNT(*) n FROM accounting_payments").n,1);assert.equal(getAccountingReport('2026-09').creators.find(c=>c.id==='owner').reference,'Bank ref 1')
 assert.equal((await call('/accounting/2026-09/paid','viewer','POST',{creatorId:'owner',reference:'x'})).status,403)
 console.log('PASS: 48h member/IP dedup, independent films, threshold, seek/replay, category priority, ownership split, exact share totals, monthly snapshots, payment idempotency, authorization and profile ownership.')
}finally{await new Promise(r=>server.close(r));global.Date=RealDate;fs.rmSync(temp,{recursive:true,force:true})}

