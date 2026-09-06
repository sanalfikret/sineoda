import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'plooy-workflow-'))
process.env.DATA_DIR = path.join(temp,'data'); process.env.UPLOADS_DIR = path.join(temp,'uploads'); process.env.NODE_ENV='test'
const { initDatabase, dbRun, dbGet } = await import('../src/db.ts')
await initDatabase()
const { default: express } = await import('express')
const { signToken } = await import('../src/middleware/auth.ts')
const { default: billingRoutes } = await import('../src/routes/billing.ts')
const { default: creatorRoutes } = await import('../src/routes/creator.ts')
const { default: adminRoutes } = await import('../src/routes/adminCreators.ts')
const { default: uploadRoutes } = await import('../src/routes/creatorUpload.ts')
const { createStudentFilmSubmission } = await import('../src/services/studentFilmSubmission.ts')
const { applyCreatorReviewStatus } = await import('../src/services/creatorContentAdmin.ts')
const { saveTranslations, readTranslations } = await import('../src/services/dynamicTranslations.ts')
const { isCreatorRegistrationPaid, activateCreatorRegistration } = await import('../src/services/creatorRegistration.ts')
const now = new Date().toISOString()
for (const id of ['standard','student_cinema','admin']) {
 dbRun('INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)',[id,id,id+'@example.test','unused',id==='admin'?'admin':'creator',now])
 if(id!=='admin') dbRun('INSERT INTO creators (id,user_id,studio_name,bio,status,created_at,program,school_id) VALUES (?,?,?,?,?,?,?,?)',[id,id,id,'','pending',now,id,'school'])
}
const app = express(); app.use(express.json()); app.use('/creator',creatorRoutes); app.use('/billing',billingRoutes); app.use('/admin',adminRoutes); app.use('/upload',uploadRoutes)
const server = app.listen(0,'127.0.0.1'); await new Promise(resolve => server.once('listening',resolve))
const base = 'http://127.0.0.1:'+server.address().port
async function call(url,id,method,body) { return fetch(base+url,{ method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+signToken({userId:id,role:id==='admin'?'admin':'creator'})},body:JSON.stringify(body) }) }
try {
 assert.equal(isCreatorRegistrationPaid({program:'standard',registration_paid_at:null}),false)
 for (const id of ['standard','student_cinema']) { const response = await call('/creator/content',id,'POST',{title:'Unpaid'}); assert.equal(response.status,402); assert.equal(dbGet('SELECT COUNT(*) AS n FROM content').n,0) }
 for (const [userId,planId] of [['standard','creator_application'],['student_cinema','student_cinema_application']]) {
   const checkout = await call('/billing/checkout',userId,'POST',{planId,provider:'paytr'})
   assert.equal(checkout.status,503)
   assert.equal((await checkout.json()).code,'PAYMENT_NOT_READY')
   assert.equal(dbGet('SELECT COUNT(*) AS n FROM content').n,0)
 }
 assert.throws(() => createStudentFilmSubmission({creatorId:'student_cinema',schoolId:'school',title:'Student',description:'',filmLink:'https://example.test/film',now}),/PAYMENT/)
 activateCreatorRegistration('student_cinema')
 assert.equal(dbGet('SELECT status FROM creators WHERE id = ?',['student_cinema']).status,'pending')
 const id = createStudentFilmSubmission({creatorId:'student_cinema',schoolId:'school',title:'Student',description:'',filmLink:'https://example.test/film',now})
 assert.equal((await call('/admin/creators/student_cinema','admin','PATCH',{status:'approved'})).status,200)
 assert.equal(dbGet('SELECT review_status FROM content WHERE id = ?',[id]).review_status,'pending')
 let row=dbGet('SELECT * FROM content WHERE id = ?',[id]); applyCreatorReviewStatus(row,'under_review'); applyCreatorReviewStatus(row,'on_hold',{publishedAt:now})
 assert.equal(dbGet('SELECT published_at FROM content WHERE id = ?',[id]).published_at,null)
 assert.throws(()=>applyCreatorReviewStatus(row,'published'),/Okul/)
 dbRun("UPDATE content SET school_review_status = 'approved' WHERE id = ?",[id]); row=dbGet('SELECT * FROM content WHERE id = ?',[id])
 applyCreatorReviewStatus(row,'approved',{publishedAt:now}); assert.equal(dbGet('SELECT published_at FROM content WHERE id = ?',[id]).published_at,null)
 applyCreatorReviewStatus(row,'published'); assert.ok(dbGet('SELECT published_at FROM content WHERE id = ?',[id]).published_at)
 applyCreatorReviewStatus(row,'rejected'); assert.equal(dbGet('SELECT published_at FROM content WHERE id = ?',[id]).published_at,null)
 const translations={tr:{title:'Film',description:'Türkçe'},en:{title:'Movie',description:'English'}}
 saveTranslations('content',id,translations); assert.deepEqual(readTranslations('content',id),translations)
 assert.throws(()=>saveTranslations('content',id,{tr:translations.tr,en:{title:'',description:''}})); assert.deepEqual(readTranslations('content',id),translations)
 activateCreatorRegistration('standard')
 const standardId = createStudentFilmSubmission({creatorId:'standard',schoolId:'school',title:'Standard',description:'',filmLink:'https://example.test/film',now})
 dbRun("UPDATE content SET program = 'standard' WHERE id = ?",[standardId])
 assert.equal((await call('/admin/creators/standard','admin','PATCH',{status:'approved'})).status,200)
 assert.equal(dbGet('SELECT review_status FROM content WHERE id = ?',[standardId]).review_status,'pending')
 const { localizeDynamic } = await import('../../src/utils/dynamicTranslations.ts')
 assert.equal(localizeDynamic({title:'Legacy',translations},'en').title,'Movie')
 assert.equal(localizeDynamic({title:'Legacy',translations},'tr').title,'Film')
 assert.equal(localizeDynamic({title:'Legacy'},'en').title,'Legacy')
 const { FILM_RIGHTS_CATEGORIES, FILM_LEGAL_DECLARATIONS, REQUIRED_RIGHTS_DOC_TYPES } = await import('../src/services/filmApplication.ts')
 for (const userId of ['standard','student_cinema']) {
   const documentIds = REQUIRED_RIGHTS_DOC_TYPES.map((type,index) => {
     const docId = userId+'-rights-'+index
     dbRun('INSERT INTO creator_documents (id,creator_id,doc_type,file_url,uploaded_at) VALUES (?,?,?,?,?)',[docId,userId,type,'/uploads/proof.pdf',now])
     return docId
   })
   const submission = await call('/creator/content',userId,'POST',{title:'Paid film '+userId,downloadLink:'https://example.test/film',trailerUrl:'https://example.test/trailer',documentIds,rightsDeclaration:Object.fromEntries([...FILM_RIGHTS_CATEGORIES,...FILM_LEGAL_DECLARATIONS].map(entry=>[entry.id,true])),credits:{directors:['Director'],producers:['Producer'],cast:[{name:'Actor',character:'Role'}]}})
   assert.equal(submission.status,201,await submission.text())
 }
 dbRun('INSERT OR REPLACE INTO site_settings (key,value) VALUES (?,?)',['billing_plans',JSON.stringify({creator_application:{interval:'month'}})])
 dbRun('UPDATE users SET subscription_expires_at = ? WHERE id = ?',['2000-01-01T00:00:00.000Z','standard'])
 const expired = await fetch(base+'/creator/dashboard',{headers:{Authorization:'Bearer '+signToken({userId:'standard',role:'creator'})}})
 assert.equal((await expired.json()).creator.registrationPaid,false)
 dbRun('DELETE FROM site_settings WHERE key = ?',['billing_plans'])
 const { isCreatorDocument } = await import('../src/services/creatorDocumentUpload.ts')
 const { externalMediaLink } = await import('../src/services/creatorMedia.ts')
 assert.equal(isCreatorDocument('paper.pdf','application/pdf',Buffer.from('%PDF-1.7')),true)
 assert.equal(isCreatorDocument('paper.doc','application/msword',Buffer.from('d0cf11e0a1b11ae1','hex')),true)
 assert.equal(isCreatorDocument('film.mp4','video/mp4',Buffer.from('video')),false)
 assert.equal(isCreatorDocument('film.pdf','application/pdf',Buffer.from('video')),false)
 assert.equal(isCreatorDocument('photo.jpg','image/jpeg',Buffer.from('image')),false)
 assert.equal(externalMediaLink('https://example.test/trailer'), 'https://example.test/trailer')
 for(const link of ['/uploads/film.mp4','data:video/mp4;base64,AAAA','javascript:alert(1)','']) assert.throws(()=>externalMediaLink(link,true))
 const uploadBody = new FormData()
 uploadBody.append('file', new Blob(['%PDF-1.7 test'], {type:'application/pdf'}), 'document.pdf')
 assert.equal((await fetch(base+'/upload/document',{method:'POST',headers:{Authorization:'Bearer '+signToken({userId:'standard',role:'creator'})},body:uploadBody})).status,201)
 const invalidBody = new FormData()
 invalidBody.append('file', new Blob(['video'], {type:'application/pdf'}), 'fake.pdf')
 assert.equal((await fetch(base+'/upload/document',{method:'POST',headers:{Authorization:'Bearer '+signToken({userId:'standard',role:'creator'})},body:invalidBody})).status,400)
 process.env.CREATOR_DIRECT_VIDEO_UPLOAD_ENABLED='true'
 assert.equal((await call('/upload/image','standard','POST',{})).status,409)
 assert.equal((await call('/upload/video','standard','POST',{})).status,409)
 console.log('PASS: unpaid creator/student, service guard, account separation, review/publication transitions, TR/EN persistence and upload guard')
} finally { await new Promise(resolve=>server.close(resolve)); fs.rmSync(temp,{recursive:true,force:true}) }
