const assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const storage=new Map();const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
const loaded=new Map();let pending
function load(file){if(loaded.has(file))return loaded.get(file);const exports={};loaded.set(file,exports)
const source=fs.readFileSync(file,'utf8').replaceAll('import.meta.env','({})')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
vm.runInNewContext(code,{exports,require:name=>name.endsWith('sessionIdentity')?load('src/utils/sessionIdentity.ts'):name.endsWith('authSession')?load('src/utils/authSession.ts'):{default:{language:'tr'}},localStorage,atob,Headers,Response,FormData,CustomEvent:class{},Event:class{},window:{dispatchEvent(){},location:{pathname:'/admin'}},fetch:()=>new Promise(resolve=>{pending=resolve})},{filename:file});return exports}
const client=load('src/api/client.ts')
const token=(id,n)=>'x.'+Buffer.from(JSON.stringify({userId:id,exp:n})).toString('base64url')+'.x'
;(async()=>{
 client.setToken(token('viewer',1));const old=client.api('/api/auth/me');client.setToken(token('admin',1));pending(new Response(JSON.stringify({token:token('viewer',2)})));await old
 assert.equal(client.getToken(),token('admin',1),'Late viewer response must not replace admin login')
 const renew=client.api('/api/auth/me');pending(new Response(JSON.stringify({token:token('admin',2)})));await renew
 assert.equal(client.getToken(),token('admin',2),'Same account renewal must work')
 const logout=client.api('/api/auth/me');client.clearAuthStorage();pending(new Response(JSON.stringify({token:token('admin',3)})));await logout
 assert.equal(client.getToken(),null,'Late response must not undo explicit logout')
 client.setToken(token('viewer',1));const crossTab=client.api('/api/auth/me');storage.set('plooy_token',token('admin',1));pending(new Response(JSON.stringify({token:token('viewer',2)})));await crossTab
 assert.equal(client.getToken(),token('admin',1),'Other-tab login must survive stale responses')
 console.log('PASS: late login response, same-account renewal, explicit logout, cross-tab race')
})().catch(e=>{console.error(e);process.exitCode=1})
