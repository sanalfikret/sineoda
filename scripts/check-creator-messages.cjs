
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,extra={}){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(code,{exports,Uint8Array,Math,Date,setTimeout,clearTimeout,AbortController,crypto:{getRandomValues:array=>require('node:crypto').randomFillSync(array)},...extra});return exports}
const ids=load('src/utils/id.ts'),deadline=load('src/utils/requestDeadline.ts');
assert.match(ids.createRandomId(),/^[a-zA-Z0-9-]{20,64}$/);
let states=[],index=0,refs=[],refIndex=0,calls=[],fail=false;
const react={useEffect(){},useState(initial){const i=index++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}]},useRef(initial){const i=refIndex++;return refs[i]??(refs[i]={current:initial})}};
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'};
const component=load('src/components/CreatorMessages.tsx',{require:n=>n==='react'?react:n==='react/jsx-runtime'?jsx:n.includes('react-i18next')?{useTranslation:()=>({i18n:{language:'tr'}})}:n.includes('AuthContext')?{useAuth:()=>({isAdmin:false})}:n.endsWith('/id')?ids:n.endsWith('/requestDeadline')?deadline:{api:async(path,options)=>{if(options?.method==='POST'){calls.push(JSON.parse(options.body));if(fail)throw Error('offline');return{sent:1}}return[]}}});
function render(){index=0;refIndex=0;return component.CreatorMessages()}
function find(node,type){if(!node)return;if(Array.isArray(node)){for(const n of node){const hit=find(n,type);if(hit)return hit}}else if(typeof node==='object'){if(node.type===type)return node;return find(node.props?.children,type)}}
(async()=>{
 let tree=render();assert.equal(tree.type,'details');assert.ok(find(tree,'summary'));
 states[6]='Konu';states[7]='Mesaj';await find(render(),'form').props.onSubmit({preventDefault(){}});
 assert.equal(states[8],false);assert.equal(states[6],'');assert.match(states[9],/Mesaj gönderildi/);assert.match(calls[0].requestId,/^[a-zA-Z0-9-]{20,64}$/);
 states[6]='Retry';states[7]='Draft';fail=true;await find(render(),'form').props.onSubmit({preventDefault(){}});
 assert.equal(states[8],false);assert.equal(states[7],'Draft');const firstId=calls.at(-1).requestId;
 fail=false;await find(render(),'form').props.onSubmit({preventDefault(){}});
 assert.equal(calls.at(-1).requestId,firstId,'retry must reuse request ID to avoid duplicate delivery');
 let signal;await assert.rejects(deadline.withRequestDeadline(s=>{signal=s;return new Promise(()=>{})},'timeout',5),/timeout/);assert.equal(signal.aborted,true);
 console.log('PASS: HTTP without randomUUID sends successfully, collapsed messages, busy recovery, preserved draft, idempotent retry and bounded request timeout');
})().catch(e=>{console.error(e);process.exitCode=1});

