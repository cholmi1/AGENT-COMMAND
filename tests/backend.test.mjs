import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { validateInput, readBody, BODY_LIMIT } from '../server/validation.mjs';
import { publicPath } from '../server/static.mjs';
import { createApi, authenticate } from '../server/api.mjs';
import { kstDay, parseFirebaseConfig, createStore, userKey } from '../server/firebase.mjs';
import { localPrompt, generatePrompt, generateHelp, generationMode } from '../server/generate.mjs';
function request(path, method='GET', body, headers={}) {
  const req=Readable.from(body === undefined ? [] : [typeof body === 'string' ? body : JSON.stringify(body)]);
  Object.assign(req,{url:path,method,headers:{host:'localhost','content-type':'application/json',...headers},socket:{}});
  return req;
}
function response() {return {headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(s,h){this.status=s;Object.assign(this.headers,h);},end(b){this.body=b ? JSON.parse(b) : null;}};}
const validWeb={apiKey:'public',authDomain:'demo.firebaseapp.com',projectId:'demo',appId:'public-app'};
const firebase={web:validWeb,auth:{async verifyIdToken(token,revoked){assert.equal(revoked,true);if(token!=='real-token')throw Error('secret');return {uid:'owner'};}}};
const authorization={authorization:'Bearer real-token'};
function store() { return {saved:[],reserved:[],async meter(){return {promptUsed:1,helpUsed:2};},async reserve(uid,type){this.reserved.push([uid,type]);},async save(uid,item){this.saved.push({uid,...item});return 'saved-id';},async history(){return [];},async remove(uid,id){if(id!=='mine')throw Object.assign(new Error(),{status:404});this.deleted=[uid,id];}}; }
function make(deps={}) {return createApi({getFirebase:()=>firebase,store:store(),mode:()=> 'local',...deps});}
async function call(api,path,method,body,headers){const res=response();await api(request(path,method,body,headers),res);return res;}
test('validation lengths, consent, unknown fields, unsupported screenshots',()=>{
 assert.equal(validateInput('prompt',{want:' 사이트 ',consent:false}).want,'사이트');
 for(const data of [{want:'a'.repeat(1201)},{want:2},{want:'x',consent:'true'},{want:'x',uid:'fake'},{want:'x',image:null},[],{}]) assert.throws(()=>validateInput('prompt',data));
 assert.throws(()=>validateInput('help',{txt:'a'.repeat(3001)}));
 assert.throws(()=>validateInput('help',{txt:'\0'}));
});
test('128KB streamed and advertised limit, malformed JSON, content-type',async()=>{
 assert.deepEqual(await readBody(request('/', 'POST', {want:'x'})),{want:'x'});
 await assert.rejects(readBody(request('/','POST','{')),/invalid_json/);
 await assert.rejects(readBody(request('/','POST','x'.repeat(BODY_LIMIT+1))),/body_too_large/);
 await assert.rejects(readBody(request('/','POST','{}',{'content-length':String(BODY_LIMIT+1)})),/body_too_large/);
 await assert.rejects(readBody(request('/','POST','{}',{'content-type':'text/plain'})),/json_required/);
});
test('routing only public allowlist, traversal, source, secrets denied',()=>{
 assert.equal(publicPath('/'),'index.html');assert.equal(publicPath('/tools/agent-prompt/'),'tools/agent-prompt/index.html');
 for(const p of ['/server/server.mjs','/.env','/.git/config','/README.md','/docs/a.html','/js/../server/a.js','/%2e%2e/server/a.js','/js/%2eenv','/js/%5cserver.js','/%zz']) assert.equal(publicPath(p),null,p);
});
test('KST day rollover and missing or mismatched Firebase fail closed',()=>{
 assert.equal(kstDay(new Date('2026-10-24T14:59:59Z')),'2026-10-24');
 assert.equal(kstDay(new Date('2026-10-24T15:00:00Z')),'2026-10-25');
 assert.throws(()=>parseFirebaseConfig({}),/firebase_unavailable/);
 const env={FIREBASE_WEB_CONFIG_JSON:JSON.stringify(validWeb),FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'demo',client_email:'x',private_key:'x'})};
 assert.deepEqual(parseFirebaseConfig(env).web,validWeb);
 assert.throws(()=>parseFirebaseConfig({...env,FIREBASE_PROJECT_ID:'other'}));
});
test('valid Firebase ID token required, fake browser UID rejected',async()=>{
 assert.equal(await authenticate(request('/','GET',null,authorization),firebase.auth),'owner');
 await assert.rejects(authenticate(request('/','GET',null,{authorization:'Bearer browser-uid'}),firebase.auth),/unauthorized/);
 for(const path of ['/api/meter','/api/history','/api/prompt','/api/help']){
  const res=await call(make(),path,path.includes('prompt')||path.includes('help')?'POST':'GET',{want:'x'});
  assert.equal(res.status,401,path);
 }
});
test('config public and sanitized, meter exact contract, board disabled, methods and CORS',async()=>{
 assert.deepEqual((await call(make(),'/api/config')).body,{firebase:validWeb,mode:'local'});
 assert.deepEqual((await call(make(),'/api/meter','GET',undefined,authorization)).body,{perUserDay:5,promptUsed:1,helpUsed:2,mode:'local',enabled:true,stopped:false});
 for(const method of ['GET','POST'])assert.equal((await call(make(),'/api/board',method)).status,410);
 assert.equal((await call(make(),'/api/config','POST')).status,405);
 assert.equal((await call(make(),'/api/config','GET',undefined,{origin:'https://evil.test'})).status,403);
 assert.equal((await call(make(),'/api/unknown')).status,404);
});
test('consent is explicit, only server UID owns saved input/output',async()=>{
 const s=store(), api=make({store:s,generatePrompt:async()=>({json:{title:'Title'},mode:'local'})});
 const a=await call(api,'/api/prompt','POST',{want:'hello'},authorization);
 assert.equal(a.body.keptId,null);assert.equal(s.saved.length,0);assert.equal(s.reserved.length,1);
 const b=await call(api,'/api/prompt','POST',{want:'hello',consent:true},authorization);
 assert.equal(b.body.keptId,'saved-id');assert.equal(s.saved[0].uid,'owner');assert.equal(s.saved[0].input.want,'hello');assert.equal(s.saved[0].output,'{"title":"Title"}');
 const c=await call(api,'/api/prompt','POST',{want:'hello',image:'base64'},authorization);assert.equal(c.status,400);assert.equal(s.reserved.length,2);
});
test('history list and owner scoped delete, error payloads sanitized',async()=>{
 const s=store(),api=make({store:s});
 assert.deepEqual((await call(api,'/api/history','GET',undefined,authorization)).body,{items:[]});
 assert.equal((await call(api,'/api/history?id=mine','DELETE',undefined,authorization)).status,200);assert.deepEqual(s.deleted,['owner','mine']);
 assert.equal((await call(api,'/api/history?id=../x','DELETE',undefined,authorization)).status,400);
 const bad=await call(make({getFirebase(){throw Error('PRIVATE KEY LEAK');}}),'/api/config');
 assert.deepEqual(bad.body,{error:'service_unavailable'});
});
test('deterministic local rules with absent paid keys',async()=>{
 const keys=[process.env.OPENAI_API_KEY,process.env.ANTHROPIC_API_KEY]; delete process.env.OPENAI_API_KEY;delete process.env.ANTHROPIC_API_KEY;
 try { assert.equal(generationMode(),'local');const b={want:'예약 사이트'};assert.deepEqual((await generatePrompt(b)).json,localPrompt(b));assert.equal((await generateHelp({txt:'permission denied'})).mode,'local'); }
 finally {for(const [i,k] of ['OPENAI_API_KEY','ANTHROPIC_API_KEY'].entries()) if(keys[i]!==undefined)process.env[k]=keys[i];}
});
test('client rules deny every document, no auth exceptions',async()=>{
 const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');assert.match(rules,/allow read, write: if false/);assert.doesNotMatch(rules,/request.auth/);
});
test('Firestore transaction enforces both persistent daily caps, atomic writes and owner delete',async()=>{
 const docs=new Map(),writes=[];
 const db={collection(name){return {doc(id='generated'){return {path:name+'/'+id,collection(sub){return db.collection(name+'/'+id+'/'+sub);},async get(){return {data:()=>docs.get(this.path)};}};}};},async runTransaction(fn){return fn({async get(ref){return {exists:docs.has(ref.path),data:()=>docs.get(ref.path)};},set(ref,v){writes.push(ref.path);docs.set(ref.path,{...docs.get(ref.path),...v});},delete(ref){docs.delete(ref.path);}});}};
 const s=createStore(db,{GLOBAL_DAILY_CAP:'7'}), now=new Date('2026-10-24T00:00:00Z');
 for(let i=0;i<5;i++)await s.reserve('a','prompt',now);
 await assert.rejects(s.reserve('a','prompt',now),/daily_limit/);
 assert.equal((await s.meter('a',now)).promptUsed,5);
 await s.reserve('a','help',now);await s.reserve('b','prompt',now);
 await assert.rejects(s.reserve('b','help',now),/global_daily_limit/);
 assert.equal(docs.get('globalDays/2026-10-24').calls,7);
 docs.set('users/'+userKey('a')+'/history/other',{ownerUid:'other'});await assert.rejects(s.remove('a','other'),/not_found/);assert.ok(docs.has('users/'+userKey('a')+'/history/other'));
});
test('OpenAI help uses plain text while prompt requests JSON; provider errors masked',async()=>{
 const fetchOld=globalThis.fetch, keyOld=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-placeholder';let payload;
 globalThis.fetch=async(_url,options)=>{payload=JSON.parse(options.body);assert.ok(options.signal);return {ok:true,json:async()=>({choices:[{message:{content:'다음 단계'}}]})};};
 try {assert.equal((await generateHelp({txt:'error'})).mode,'ai');assert.equal(payload.response_format,undefined);
 globalThis.fetch=async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:'{"title":"ok"}'}}]})};};
 assert.equal((await generatePrompt({want:'site'})).mode,'ai');assert.deepEqual(payload.response_format,{type:'json_object'});
 globalThis.fetch=async()=>{throw Error('sk-secret-should-not-escape');};const result=await generatePrompt({want:'site'});assert.equal(result.mode,'local');assert.equal(result.error,undefined);
 } finally {globalThis.fetch=fetchOld;if(keyOld===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=keyOld;}
});

test('Vercel pre-parsed object/string/Buffer bodies retain size and JSON validation', async()=>{
 for (const body of [{want:'x'},'{"want":"x"}',Buffer.from('{"want":"x"}')]) {
  const req=request('/','POST');req.body=body;assert.deepEqual(await readBody(req),{want:'x'});
 }
 const huge=request('/','POST');huge.body={want:'x'.repeat(BODY_LIMIT)};await assert.rejects(readBody(huge),/body_too_large/);
 const malformed=request('/','POST');malformed.body='{';await assert.rejects(readBody(malformed),/invalid_json/);
});
