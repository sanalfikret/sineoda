import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'plooy-payment-test-'))
process.env.DATA_DIR=path.join(temp,'data');process.env.UPLOADS_DIR=path.join(temp,'uploads');process.env.NODE_ENV='test'
process.env.PAYTR_MERCHANT_KEY='test-key';process.env.PAYTR_MERCHANT_SALT='test-salt'
const {initDatabase,dbRun,dbGet}=await import('../src/db.ts');await initDatabase()
const {default:router}=await import('../src/routes/billing.ts')
const {default:express}=await import('express');const app=express();app.use(express.json());app.use(router);app.use((err,req,res,next)=>res.status(500).json({error:err.message}))
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r))
const realFetch=global.fetch;let iyzicoResult={}
global.fetch=(url,options)=>String(url).includes('iyzipay.com')?Promise.resolve({json:async()=>iyzicoResult}):realFetch(url,options)
const post=(url,body)=>realFetch('http://127.0.0.1:'+server.address().port+url,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
const user=id=>dbGet('SELECT * FROM users WHERE id=?',[id]);const order=id=>dbGet('SELECT * FROM payment_orders WHERE id=?',[id])
function setup(id,plan='standard',provider='paytr') {
 dbRun('INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)',[id,id,id+'@test.invalid','x',plan==='standard'?'user':'creator',new Date().toISOString()])
 if(plan!=='standard')dbRun('INSERT INTO creators(id,user_id,studio_name,bio,status,program,created_at) VALUES(?,?,?,?,?,?,?)',[id,id,id,'','pending',plan==='creator_application'?'standard':'student_cinema',new Date().toISOString()])
 dbRun('INSERT INTO payment_orders(id,user_id,plan_id,provider,amount,status,merchant_oid,created_at) VALUES(?,?,?,?,?,?,?,?)',[id,id,plan,provider,6900,'pending',id,new Date().toISOString()])
}
const callback=(id,status='success',valid=true)=>post('/callback/paytr',{merchant_oid:id,status,total_amount:'6900',hash:valid?crypto.createHmac('sha256','test-key').update(id+'test-salt'+status+'6900').digest('base64'):'invalid'})
try {
 const {planExpiryFor}=await import('../src/services/billingPlanDefaults.ts')
 for(const [date,interval,expected] of [
  ['2026-01-31T14:00:00.000Z','month','2026-02-28T14:00:00.000Z'],
  ['2028-01-31T14:00:00.000Z','month','2028-02-29T14:00:00.000Z'],
  ['2028-02-29T14:00:00.000Z','year','2029-02-28T14:00:00.000Z'],
  ['2026-12-15T14:00:00.000Z','month','2027-01-15T14:00:00.000Z'],
 ]) assert.equal(planExpiryFor({interval},new Date(date)),expected)
 for(const status of ['active','cancelled']) {
  const id='early-'+status;setup(id)
  dbRun('UPDATE users SET subscription_status=?, subscription_expires_at=? WHERE id=?',[status,'2090-01-31T14:00:00.000Z',id])
  await callback(id);assert.equal(user(id).subscription_expires_at,'2090-02-28T14:00:00.000Z')
  await callback(id);assert.equal(user(id).subscription_expires_at,'2090-02-28T14:00:00.000Z')
 }
 setup('expired');dbRun("UPDATE users SET subscription_status='active',subscription_expires_at='2020-01-01T00:00:00.000Z' WHERE id='expired'")
 await callback('expired');assert.ok(Date.parse(user('expired').subscription_expires_at)>Date.now())
 console.log('PASS: month-end, leap year, year rollover, early renewal, cancelled renewal, expired renewal, duplicate callback')
 for(const [id,plan] of [['viewer','standard'],['creator','creator_application'],['student','student_cinema_application']]) {
  setup(id,plan);await callback(id,'success',false);assert.equal(order(id).status,'pending');assert.notEqual(user(id).subscription_status,'active')
  await callback(id,'failed');assert.equal(order(id).status,'failed');assert.notEqual(user(id).subscription_status,'active')
  await callback(id);assert.equal(order(id).status,'paid');assert.equal(user(id).subscription_status,'active')
  const expiry=user(id).subscription_expires_at;await callback(id);await callback(id,'failed');assert.equal(order(id).status,'paid');assert.equal(user(id).subscription_expires_at,expiry)
  if(plan!=='standard')assert.ok(dbGet('SELECT registration_paid_at FROM creators WHERE id=?',[id]).registration_paid_at)
 }
 setup('rollback');dbRun("CREATE TRIGGER break_payment BEFORE UPDATE ON payment_orders WHEN NEW.id='rollback' AND NEW.status='paid' BEGIN SELECT RAISE(ABORT,'test'); END")
 assert.equal((await callback('rollback')).status,500);assert.equal(order('rollback').status,'pending');assert.notEqual(user('rollback').subscription_status,'active')
 dbRun('DROP TRIGGER break_payment');await callback('rollback');assert.equal(order('rollback').status,'paid')
 setup('iyzico','standard','iyzico');iyzicoResult={status:'success',paymentStatus:'SUCCESS',basketId:'iyzico'}
 for(let i=0;i<2;i++){const r=await post('/callback/iyzico',{token:'test'});assert.ok(r.headers.get('location').endsWith('/odeme/basarili'));assert.equal(order('iyzico').status,'paid')}
 iyzicoResult={status:'success',paymentStatus:'FAILURE',basketId:'iyzico'};await post('/callback/iyzico',{token:'test'});assert.equal(order('iyzico').status,'paid')
 setup('iyzico-failure','standard','iyzico');iyzicoResult={status:'success',paymentStatus:'FAILURE',basketId:'iyzico-failure'};await post('/callback/iyzico',{token:'test'});assert.equal(order('iyzico-failure').status,'failed');assert.notEqual(user('iyzico-failure').subscription_status,'active')
 console.log('PASS: signed callbacks, failure/unpaid, viewer/creator/student activation, duplicate success, late failure, atomic rollback and retry; provider responses simulated')
} finally {global.fetch=realFetch;server.close()}
