/** Offline ALIF LABS integration tests. Does not contact Google or ZATCA. */
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import worker from '../worker/index.js';
const { privateKey } = generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const registryHeaders = ['tenant_id','company_name','owner_name','email','password_salt','password_hash','phone','status','spreadsheet_id','created_at','provision_state','provisioned_at','provision_error'];
const recordHeaders = ['id','brand_id','reference','name','status','amount','date','updated_at','data_json'];
const tables = { MASTER: { Clients: [registryHeaders] }, ALPHA:{ Clients:[recordHeaders], Quotations:[recordHeaders], Invoices:[recordHeaders], DeliveryNotes:[recordHeaders],ClientPOs:[recordHeaders],Vendors:[recordHeaders],PurchaseOrders:[recordHeaders],AuditLogs:[['event_id','brand_id','table','record_id','action','actor','timestamp','reference','details']] }, BETA:{Clients:[recordHeaders], Quotations:[recordHeaders],Invoices:[recordHeaders],DeliveryNotes:[recordHeaders],ClientPOs:[recordHeaders],Vendors:[recordHeaders],PurchaseOrders:[recordHeaders],AuditLogs:[['event_id','brand_id','table','record_id','action','actor','timestamp','reference','details']] }};
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url,options={})=>{
 const u = new URL(url);
 if(u.hostname==='oauth2.googleapis.com') return Response.json({access_token:'test-token',expires_in:3600});
 assert.equal(u.hostname,'sheets.googleapis.com');
 const spreadsheet = u.pathname.match(/\/spreadsheets\/([^/]+)/)?.[1];
 assert.ok(tables[spreadsheet], 'Invalid sheet '+spreadsheet);
 if(u.pathname.endsWith(':batchUpdate')) { const reqs = JSON.parse(options.body).requests||[]; for(const r of reqs) tables[spreadsheet][r.addSheet?.properties?.title] ??= []; return Response.json({replies:[]}); }
 if(!u.pathname.includes('/values/')) return Response.json({sheets:Object.keys(tables[spreadsheet]).map(title=>({properties:{title}}))});
 const range=decodeURIComponent(u.pathname.split('/values/')[1]).replace(/:append$/,'');
 const sheet=range.split('!')[0];
 const rows=tables[spreadsheet][sheet];
 if(!rows) return Response.json({error:'No such sheet'},{status:404});
 if(options.method==='POST' && u.pathname.endsWith(':append')) { const added=JSON.parse(options.body).values; rows.push(...added); return Response.json({updates:{updatedRows:added.length}}); }
 if(options.method==='PUT') {
   const match=range.match(/![A-Z]+(\d+):[A-Z]+\d+/);
   assert.ok(match,'invalid range '+range);
   rows[Number(match[1])-1]=JSON.parse(options.body).values[0];
   return Response.json({updatedRows:1});
 }
 return Response.json({values:rows});
};
const env={AUTH_SECRET:'random-test-secret-ALIF',MASTER_SPREADSHEET_ID:'MASTER',SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'account@example.com',private_key:privateKey}),ALLOW_TAX_INVOICE_ISSUANCE:'false'};
async function call(path,method='GET',token='',body) {
 const r=await worker.fetch(new Request('https://alif.example/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
 return {status:r.status,data:await r.json()};
}
const account=(company,email)=>({company_name:company,owner_name:'Company Owner',email,password:'correct horse battery staple',phone:'+966501234567'});
try {
 assert.equal((await call('/health')).status,200);
 assert.equal((await call('/register','POST','',account('Alpha Trading','alpha@example.com'))).status,201);
 assert.equal((await call('/register','POST','',account('Beta Services','beta@example.com'))).status,201);
 assert.equal((await call('/register','POST','',account('Duplicate','alpha@example.com'))).status,409);
 const master=tables.MASTER.Clients;
 assert.equal(master[1][7],'Pending'); assert.ok(master[1][5]); assert.ok(!master[1].includes('correct horse battery staple'));
 assert.equal((await call('/login','POST','',{email:'alpha@example.com',password:'correct horse battery staple'})).status,403);
 master[1][7]='Active';
 assert.equal((await call('/login','POST','',{email:'alpha@example.com',password:'correct horse battery staple'})).status,503);
 master[1][8]='ALPHA'; master[1][10]='Ready'; master[2][7]='Active'; master[2][8]='BETA'; master[2][10]='Ready';
 const loginA=await call('/login','POST','',{email:'alpha@example.com',password:'correct horse battery staple'});
 const loginB=await call('/login','POST','',{email:'beta@example.com',password:'correct horse battery staple'});
 assert.equal(loginA.status,200); assert.equal(loginB.status,200);
 const alice=loginA.data.token,bob=loginB.data.token;
 assert.equal((await call('/me','GET',alice)).data.user.company_name,'Alpha Trading');
 assert.equal((await call('/records/Clients','GET',alice)).data.records.length,0);
 const add=await call('/records/Clients','POST',alice,{name:'Customer One',email:'buyer@domain.com',phone:'+966501234567',address:'Jeddah'});
 assert.equal(add.status,201,JSON.stringify(add.data));
 assert.equal((await call('/records/Clients','GET',alice)).data.records.length,1);
 assert.equal((await call('/records/Clients','GET',bob)).data.records.length,0);
 assert.equal((await call('/products','GET',alice)).status,404);
 assert.equal((await call('/records/Invoices','POST',alice,{name:'Test'})).status,403);
 const draft=await call('/records/Invoices','POST',alice,{name:'Customer One',client_id:add.data.record.id,status:'Draft',seller_name:'Alpha Trading',items:[{description:'Software service',quantity:1,unit_price:100}],adjustments:[]});
 assert.equal(draft.status,201,JSON.stringify(draft.data));
 assert.equal(draft.data.record.status,'Draft');
 assert.equal((await call('/records/Invoices/'+draft.data.record.id,'PATCH',alice,{status:'Active'})).status,403);
 master[1][7]='Suspended';
 assert.equal((await call('/records/Clients','GET',alice)).status,401);
 assert.equal((await call('/records/Clients','GET',bob)).status,200);
 console.log('PASS: register, salted passwords, duplicate, pending, provisioning, login, isolation, block products/tax issuance, live suspension');
} finally { globalThis.fetch=fetchOriginal; }
