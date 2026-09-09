const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,require,extra={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require,...extra});return exports}
let effects=[],calls=[],location={key:'a',pathname:'/listem',search:'',hash:''},frame;
const win={history:{scrollRestoration:'auto'},scrollTo:o=>calls.push(o)};
const scroll=load('src/components/RouteScrollReset.tsx',n=>n==='react'?{useLayoutEffect:f=>effects.push(f)}:{useLocation:()=>location},{window:win,document:{getElementById:id=>id==='target'?{scrollIntoView:()=>calls.push('anchor')}:null},requestAnimationFrame:f=>{frame=f;return 1},cancelAnimationFrame:()=>{frame=null}});
scroll.RouteScrollReset();const clean=effects[0]();effects[1]();assert.equal(calls[0].top,0);assert.equal(calls[0].behavior,'instant');
location={...location,key:'b',pathname:'/creator/kayit'};effects=[];scroll.RouteScrollReset();effects[1]();assert.equal(calls.length,2);
location={...location,key:'c',hash:'#target'};effects=[];scroll.RouteScrollReset();effects[1]();frame();assert.equal(calls.at(-1),'anchor');clean();assert.equal(win.history.scrollRestoration,'auto');
class Node {constructor(owner){this.owner=owner}}
let states=[false,true,true,true,0],stateIndex=0,refIndex=0;const listeners={},refs=[],cleanups=[];
effects=[];
const react={useState:()=>{const i=stateIndex++;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]},useRef:()=>{const i=refIndex++;const ref={current:{contains:n=>i===0?n.owner!=='outside':n.owner===i}};refs.push(ref);return ref},useEffect:f=>effects.push(f),useMemo:f=>f()};
const document={body:{style:{overflow:''}},addEventListener:(k,f)=>listeners[k]=f,removeEventListener:(k,f)=>{if(listeners[k]===f)delete listeners[k]}};
const header=load('src/components/Header.tsx',n=>{
 if(n==='react')return react;if(n==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 if(n==='react-router-dom')return{useLocation:()=>({pathname:'/listem',key:'x'}),useNavigate:()=>()=>{},Link:'a'};
 if(n==='react-i18next')return{useTranslation:()=>({t:k=>k})};
 if(n.includes('AuthContext'))return{useAuth:()=>({user:null})};
 if(n.includes('ContentContext'))return{useContent:()=>({hiddenNavIds:[]})};
 if(n.includes('SearchContext'))return{useSearchUI:()=>({})};
 if(n.includes('LocaleContext'))return{useLocale:()=>({localizePath:x=>x})};
 if(n.includes('paths'))return{toTrPathname:x=>x};
 if(n.includes('siteNav'))return{SITE_NAV_ITEMS:[],PRIMARY_NAV_IDS:[],EXPLORE_NAV_IDS:[]};
 return {};
},{Node,document,window:{addEventListener(){},removeEventListener(){},scrollY:0}});
header.Header();for(const f of effects){const c=f();if(c)cleanups.push(c)}
states[1]=states[2]=states[3]=true;listeners.pointerdown({target:new Node(1)});assert.equal(states[2],true,'inside account menu stays open');assert.equal(states[3],false);
states[1]=states[2]=states[3]=true;listeners.pointerdown({target:new Node('outside')});assert.deepEqual(states.slice(1,4),[false,false,false]);
states[1]=states[2]=states[3]=true;listeners.keydown({key:'Escape'});assert.deepEqual(states.slice(1,4),[false,false,false]);
for(const c of cleanups)c();assert.equal(document.body.style.overflow,'');assert.equal(Object.keys(listeners).length,0);
console.log('PASS: page entry resets instantly, anchor navigation preserved, outside click and Escape close menus, inside click preserved, listeners and body lock cleaned up');
