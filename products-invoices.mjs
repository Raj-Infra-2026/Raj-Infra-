import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import worker from '../worker/index.js';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const headers=['id','brand_id','reference','name','status','amount','date','updated_at','data_json'];
const sheets={Clients:[headers,['client-1','','','Existing Client','Active',0,'2026-10-28','2026-10-28',JSON.stringify({address:'Jeddah',vat_number:'123456789012345',email:'old@example.com',phone:'+966501234567'})]],Invoices:[headers],DeliveryNotes:[headers],AuditLogs:[['event_id','brand_id','table','record_id','action','actor','timestamp','reference','details_json']]};
let createCount=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const u=new URL(url);
 if(u.hostname==='oauth2.googleapis.com')return Response.json({access_token:'token',expires_in:3600});
 if(u.hostname!=='sheets.googleapis.com')throw Error('Unexpected '+url);
 if(u.pathname.endsWith(':batchUpdate')){const b=JSON.parse(opts.body);for(const req of b.requests||[]){const title=req.addSheet?.properties?.title;if(title&&!sheets[title]){sheets[title]=[];createCount++}}return Response.json({replies:[{}]});}
 if(!u.pathname.includes('/values/'))return Response.json({sheets:Object.keys(sheets).map(title=>({properties:{title}}))});
 const raw=decodeURIComponent(u.pathname.split('/values/')[1]||'');const tab=raw.split('!')[0];const rows=sheets[tab];if(!rows)return Response.json({error:'Missing tab'},{status:404});
 if(opts.method==='POST'&&u.pathname.endsWith(':append')){const values=JSON.parse(opts.body).values;rows.push(...values);return Response.json({updates:{updatedRows:values.length}})}
 if(opts.method==='PUT'){const match=raw.match(/![A-Z]+(\d+):[A-Z]+\d+/);assert.ok(match,raw);const index=Number(match[1])-1;rows[index]=JSON.parse(opts.body).values[0];return Response.json({updatedRows:1})}
 return Response.json({values:rows});
};
const env={AUTH_SECRET:'mock-long-secret',USERS_JSON:JSON.stringify(['staff','manager','admin'].map(role=>({username:role,password:'pass',role}))),SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'mock@example.com',private_key:privateKey}),SPREADSHEET_ID:'mock'};
async function call(path,method='GET',token='',body){const req=new Request('https://raj.ani-infra.workers.dev/api'+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const res=await worker.fetch(req,env);return{status:res.status,data:await res.json()}}
try{
 const staff=(await call('/login','POST','',{username:'staff',password:'pass'})).data.token;
 const manager=(await call('/login','POST','',{username:'manager',password:'pass'})).data.token;
 const admin=(await call('/login','POST','',{username:'admin',password:'pass'})).data.token;
 const first=await call('/products','GET',staff);assert.equal(first.status,200);assert.deepEqual(first.data.products,[]);assert.equal(createCount,1);assert.deepEqual(sheets.Products[0],['id','product_name','product_brand','sku','created_at','updated_at','status']);
 const product=(await call('/products','POST',staff,{name:'Face Mask Black',brand:'EcoMaid',sku:'fm-100'}));assert.equal(product.status,201);assert.equal(product.data.product.sku,'FM-100');
 const duplicate=await call('/products','POST',staff,{name:'Other',brand:'Other',sku:'FM-100'});assert.equal(duplicate.status,409);
 assert.equal((await call('/products','GET',staff)).data.products.length,1);
 assert.equal((await call('/products/'+product.data.product.id,'PATCH',staff,{name:'New'})).status,403);
 assert.equal((await call('/products/'+product.data.product.id,'PATCH',manager,{name:'Face Mask Premium'})).status,200);
 const line={product_id:product.data.product.id,sku:'FM-100',brand:'EcoMaid',description:'Face Mask Black',quantity:3,unit_price:100};
 const invoice=await call('/records/Invoices','POST',staff,{name:'Existing Client',client_id:'client-1',seller_name:'Raj Infra',seller_vat:'311547563200003',buyer_name:'Existing Client',date:'2026-10-28',items:[line]});
 assert.equal(invoice.status,201,JSON.stringify(invoice.data));assert.equal(invoice.data.record.amount,345);assert.equal(invoice.data.record.vat_amount,45);assert.equal(invoice.data.record.subtotal,300);assert.equal(invoice.data.record.items[0].sku,'FM-100');assert.ok(invoice.data.record.reference.startsWith('INV-'));
 const invoiceList=await call('/records/Invoices','GET',staff);assert.equal(invoiceList.data.records[0].items[0].brand,'EcoMaid');
 const delivery=await call('/records/DeliveryNotes','POST',staff,{name:'Existing Client',client_id:'client-1',sender_name:'Editable Supplier',date:'2026-10-28',items:[{description:'Face Mask Black',sku:'FM-100',quantity:20,unit:'CRTN',remarks:'Handle with care'}]});
 assert.equal(delivery.status,201,JSON.stringify(delivery.data));assert.equal(delivery.data.record.sender_name,'Editable Supplier');assert.equal(delivery.data.record.items[0].unit,'CRTN');assert.equal(delivery.data.record.amount,0);
 const update=await call('/records/Invoices/'+invoice.data.record.id,'PATCH',manager,{status:'Paid'});assert.equal(update.status,200);assert.equal(update.data.record.items[0].sku,'FM-100');assert.equal(update.data.record.amount,345);
 const archived=await call('/products/'+product.data.product.id,'DELETE',admin);assert.equal(archived.status,200);assert.equal((await call('/products','GET',staff)).data.products.length,0);
 assert.equal((await call('/records/Clients','GET',staff)).data.records.length,1);
 assert.equal(createCount,1);
 console.log('PASS: Products tab auto-create, headers, CRUD, SKU duplicate, permissions, invoices 15% VAT, metadata, delivery, old clients, unchanged legacy routes');
}finally{globalThis.fetch=originalFetch}
