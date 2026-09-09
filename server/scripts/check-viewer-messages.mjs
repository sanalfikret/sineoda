import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'plooy-messages-'))
process.env.DATA_DIR=path.join(temp,'data');process.env.UPLOADS_DIR=path.join(temp,'uploads');process.env.NODE_ENV='test'
const {initDatabase,dbRun,dbGet,dbTransaction}=await import('../src/db.ts');await initDatabase()
dbTransaction(()=>{for(let i=0;i<10002;i++)dbRun('INSERT INTO users(id,name,email,password_hash,role,created_at,subscription_status) VALUES(?,?,?,?,?,?,?)',[String(i),'Test',i+'@test.invalid','x',i===10000?'admin':i===10001?'creator':'user',new Date().toISOString(),i<5?'active':'free'])})
const {signToken}=await import('../src/middleware/auth.ts')
const {default:router}=await import('../src/routes/adminMessages.ts')
const {default:express}=await import('express');const app=express();app.use(express.json());app.use(router)
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r))
const send=async(url,data,role='admin')=>{const r=await fetch('http://127.0.0.1:'+server.address().port+url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+signToken({userId:role==='admin'?'10000':'0',role})},body:JSON.stringify(data)});return {status:r.status,data:await r.json()}}
const count=()=>dbGet('SELECT COUNT(*) AS n FROM user_messages').n
try {
 const data={requestId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',subject:'Test',body:'Body',audience:'all'}
 const start=Date.now();assert.equal((await send('/broadcast',data)).data.sent,10000);assert.equal(count(),10000);console.log('10000 recipients ms:',Date.now()-start)
 assert.equal((await send('/broadcast',data)).data.sent,10000);assert.equal(count(),10000)
 assert.equal((await send('/broadcast',{...data,body:'Changed'})).status,400)
 assert.equal((await send('/broadcast',data,'user')).status,403)
 assert.equal((await send('/broadcast',{...data,requestId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',audience:'active_subscribers'})).data.sent,5)
 const single={...data,requestId:'cccccccc-cccc-cccc-cccc-cccccccccccc'};await send('/users/0',single);await send('/users/0',single);assert.equal(count(),10006)
 dbRun("CREATE TRIGGER fail_message BEFORE INSERT ON user_messages WHEN NEW.user_id = '5' BEGIN SELECT RAISE(ABORT, 'test rollback'); END")
 const failure={...data,requestId:'dddddddd-dddd-dddd-dddd-dddddddddddd'};assert.equal((await send('/broadcast',failure)).status,400);assert.equal(count(),10006)
 assert.equal(dbGet('SELECT COUNT(*) AS n FROM admin_message_requests WHERE request_id = ?',[failure.requestId]).n,0)
 dbRun('DROP TRIGGER fail_message');assert.equal((await send('/broadcast',failure)).data.sent,10000)
 console.log('PASS: deduplication, audiences, single recipient, admin authorization, rollback and retry')
} finally {server.close()}
