/* Offline mock smoke test. No live Google or Cloudflare requests. */
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import worker from '../worker/index.js';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const header=['id','brand_id','reference','name','status','amount','date','updated_at','data_json'];
const sheets={Clients:[header,['client-a','','','Old Client','Active',0,'2026-10-28','2026-10-28',JSON.stringify({email:'old@company.com',phone:'+966501234567',address:'Jeddah'})],['client-b','BRAND-2','','Other Client','Active',0,'2026-10-28','2026-10-28',JSON.stringify({email:'other@company.com',phone:'+966501234568',address:'Riyadh'})]],AuditLogs:[['event_id','brand_id','table','record_id','action','actor','timestamp','reference','details_json']]};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{const u=new URL(url);if(u.hostname==='oauth2.googleapis.com')return Response.json({access_token:'mock-token',expires_in:3600});if(u.hostname==='sheets.googleapis.com'){const raw=decodeURIComponent(u.pathname.split('/values/')[1]||'');const table=raw.split('!')[0];if(!sheets[table])sheets[table]=[header];const rows=sheets[table];if(opts.method==='POST'&&u.pathname.endsWith(':append')){const added=JSON.parse(opts.body).values;rows.push(...added);return Response.json({updates:{updatedRows:added.length}})}if(opts.method==='PUT'){const match=raw.match(/!A(\d+):I\d+/);assert.ok(match);rows[Number(match[1])-1]=JSON.parse(opts.body).values[0];return Response.json({updatedRows:1})}return Response.json({values:rows})}throw Error('Unexpected URL '+url)};
const env={AUTH_SECRET:'test-secret-long-enough',USERS_JSON:JSON.stringify([{username:'staff',password:'test-pass',role:'staff'},{username:'manager',password:'test-pass',role:'manager'},{username:'admin',password:'test-pass',role:'admin'}]),SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'test@example.com',private_key:privateKey}),SPREADSHEET_ID:'mock-spreadsheet'};
async function call(path,method='GET',token='',body){const req=new Request('https://test.example/api'+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const r=await worker.fetch(req,env);return {status:r.status,data:await r.json()}}
try{
  const health=await call('/health');assert.equal(health.data.ok,true);
  const staffLogin=await call('/login','POST','',{username:'staff',password:'test-pass'});assert.equal(staffLogin.status,200);const staff=staffLogin.data.token;
  const me=await call('/me','GET',staff);assert.equal(me.status,200);assert.equal('brands' in me.data,false);
  const list=await call('/records/Clients','GET',staff);assert.equal(list.status,200);assert.deepEqual(list.data.records.map(x=>x.name),['Old Client','Other Client']);assert.ok(list.data.records.every(x=>!('brand_id' in x)));
  const search=await call('/search?q=Client','GET',staff);assert.equal(search.data.results.length,2);
  const overview=await call('/overview','GET',staff);assert.equal(overview.data.counts.Clients,2);
  const blocked=await call('/records/Clients/client-a','PATCH',staff,{name:'Nope'});assert.equal(blocked.status,403);
  const created=await call('/records/Clients','POST',staff,{name:'Third Client',email:'third@example.com',phone:'+966501234569',address:'Jeddah'});assert.equal(created.status,201);assert.equal(created.data.record.brand_id,'');
  const updated=await call('/records/Clients','GET',staff);assert.equal(updated.data.records.length,3);
  const mgr=(await call('/login','POST','',{username:'manager',password:'test-pass'})).data.token;
  const editStatus=await call('/records/Clients/client-a','PATCH',mgr,{status:'Inactive'});assert.equal(editStatus.status,200);
  const mgrName=await call('/records/Clients/client-a','PATCH',mgr,{name:'Renamed'});assert.equal(mgrName.status,403);
  const admin=(await call('/login','POST','',{username:'admin',password:'test-pass'})).data.token;
  const archive=await call('/records/Clients/client-b','DELETE',admin);assert.equal(archive.status,200);
  const final=await call('/records/Clients','GET',staff);assert.equal(final.data.records.length,2);
  console.log('PASS: health, login, no brands, legacy records, search, overview, create, edit permissions, archive');
}finally{globalThis.fetch=originalFetch}
