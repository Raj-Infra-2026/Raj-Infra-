/* Raj Infra V2 Part 1 — Cloudflare Worker / Google Sheets adapter.
   A:I original sheet format retained. Configure secrets via wrangler secret put. */
const TABLES = ['Clients','Quotations','Invoices','DeliveryNotes','ClientPOs','Vendors','PurchaseOrders'];
const DOCS = ['Quotations','Invoices','DeliveryNotes','ClientPOs','PurchaseOrders'];
const ROLES = {admin:['read','create','update','delete'],manager:['read','create','update'],staff:['read','create']};
const enc=new TextEncoder(), dec=new TextDecoder();
let tokenCache={value:null,expires:0};
let tokenPending=null;
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function unb64(s){const v=s.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(v+'='.repeat((4-v.length%4)%4)),c=>c.charCodeAt(0))}
async function key(secret){return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
async function sign(p,secret){const body=b64(enc.encode(JSON.stringify(p)));return body+'.'+b64(await crypto.subtle.sign('HMAC',await key(secret),enc.encode(body)))}
async function verify(t,secret){try{const [body,sig,extra]=t.split('.');if(!body||!sig||extra)return null;const ok=await crypto.subtle.verify('HMAC',await key(secret),unb64(sig),enc.encode(body));if(!ok)return null;const p=JSON.parse(dec.decode(unb64(body)));return p.exp>Date.now()?p:null}catch{return null}}
function reply(data,status=200,origin=''){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}})}
function cors(req,env){const o=req.headers.get('Origin')||'';return (env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).includes(o)?o:''}
function parseJSON(s,fallback){try{return JSON.parse(s)}catch{return fallback}}
function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0}
async function passwordOK(u,password){if(typeof password!=='string'||password.length>256)return false;if(u.password_hash&&u.password_salt){const raw=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(u.password_salt),iterations:210000},raw,256);return safeEqual(b64(bits),u.password_hash)}return !!u.password&&safeEqual(u.password,password)}
async function googleToken(env){if(tokenCache.value&&Date.now()<tokenCache.expires)return tokenCache.value;if(tokenPending)return tokenPending;tokenPending=(async()=>{const sa=parseJSON(env.SERVICE_ACCOUNT_JSON,{});if(!sa.client_email||!sa.private_key)throw Error('Invalid service account configuration');const h=b64(enc.encode(JSON.stringify({alg:'RS256',typ:'JWT'}))),now=Math.floor(Date.now()/1000);const p=b64(enc.encode(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3500})));const raw=sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');const k=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(raw),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);const sig=b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',k,enc.encode(h+'.'+p)));const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:h+'.'+p+'.'+sig})});if(!r.ok)throw Error('Google authentication failed ('+r.status+')');const d=await r.json();tokenCache={value:d.access_token,expires:Date.now()+Math.min(3300,(d.expires_in||3600)-120)*1000};return d.access_token})();try{return await tokenPending}finally{tokenPending=null}}
async function sheet(env,table,method='GET',range='A:I',body){if(![...TABLES,'AuditLogs'].includes(table))throw Error('Invalid table');const token=await googleToken(env);const base=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.SPREADSHEET_ID)}/values/${encodeURIComponent(table+'!'+range)}`;const url=method==='APPEND'?base+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS':method==='PUT'?base+'?valueInputOption=RAW':base;const r=await fetch(url,{method:method==='APPEND'?'POST':method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('Google Sheets '+table+' failed ('+r.status+')');return r.json()}
function fromRow(r){let extra=parseJSON(r[8]||'{}',{});if(!extra||typeof extra!=='object'||Array.isArray(extra))extra={};return{...extra,id:r[0]||'',brand_id:r[1]||'',reference:r[2]||'',name:r[3]||'',status:r[4]||'',amount:Number(r[5]||0),date:r[6]||'',updated_at:r[7]||''}}
function toRow(r){const{id,brand_id,reference,name,status,amount,date,updated_at,...extra}=r;return[id||'',brand_id||'',reference||'',name||'',status||'',Number(amount)||0,date||'',updated_at||new Date().toISOString(),JSON.stringify(extra)]}
async function records(env,table){const r=await sheet(env,table);return(r.values||[]).slice(1).map((cells,i)=>({row:i+2,...fromRow(cells)})).filter(x=>x.id&&x.status!=='Deleted')}
function visible(user,r){return !!r.id&&r.status!=='Deleted'}
function clean(body,user,old){const now=new Date().toISOString();const fields=['name','reference','status','amount','date','client_id','email','phone','address','vat_number','notes','due_date','items','discount','tax_rate','payment_terms'];const r={...(old||{})};for(const f of fields)if(Object.prototype.hasOwnProperty.call(body,f))r[f]=body[f];r.id=old?.id||crypto.randomUUID();r.brand_id=old?.brand_id||'';r.created_by=old?.created_by||user.username;r.created_at=old?.created_at||now;r.updated_at=now;r.name=String(r.name||'').trim().slice(0,250);r.reference=String(r.reference||'').trim().slice(0,80);r.status=String(r.status||'Draft').slice(0,40);r.date=String(r.date||now.slice(0,10)).slice(0,10);r.amount=Number(r.amount||0);if(!Number.isFinite(r.amount)||r.amount<0||r.amount>1e12)throw Error('Invalid amount');if(!r.name)throw Error('Name is required');if(Array.isArray(r.items)&&Object.prototype.hasOwnProperty.call(body,'items')){if(r.items.length>100)throw Error('Too many line items');r.items=r.items.map(x=>({description:String(x.description||'').slice(0,200),quantity:Number(x.quantity||0),unit_price:Number(x.unit_price||0)}));if(r.items.some(x=>!x.description||!Number.isFinite(x.quantity)||!Number.isFinite(x.unit_price)||x.quantity<0||x.unit_price<0))throw Error('Invalid line items');const subtotal=r.items.reduce((s,x)=>s+x.quantity*x.unit_price,0),discount=Number(r.discount||0),tax=Number(r.tax_rate||0);if(!Number.isFinite(discount)||discount<0||discount>subtotal||!Number.isFinite(tax)||tax<0||tax>100)throw Error('Invalid discount or tax');r.amount=Math.round(((subtotal-discount)*(1+tax/100)+Number.EPSILON)*100)/100}return r}
function titleClient(s){return String(s||'').replace(/(^|[\s\-'])\p{L}/gu,m=>m.toLocaleUpperCase())}
function validateClient(b){const email=String(b.email||'').trim();if(!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(email)||email.includes('..')||email.length>254)throw Error('Invalid client email address');const phone=String(b.phone||'').replace(/[\s()-]/g,'');if(!/^\+[1-9]\d{6,14}$/.test(phone))throw Error('Invalid client phone number');if(!String(b.address||'').trim())throw Error('Client address is required');if(!['Active','Inactive'].includes(b.status||'Active'))throw Error('Invalid client status');if(b.maps_url&&!/^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl\/)/i.test(String(b.maps_url)))throw Error('Invalid Google Maps URL')}
async function audit(env,user,action,table,r){try{await sheet(env,'AuditLogs','APPEND','A:I',{values:[[crypto.randomUUID(),r.brand_id||'',table,r.id,action,user.username,new Date().toISOString(),r.reference||'',JSON.stringify({status:r.status})]]});return true}catch(e){console.error('Audit log write failed',e);return false}}

// Additive Products worksheet: isolated from the original seven business tables.
const PRODUCT_HEADERS=['id','product_name','product_brand','sku','created_at','updated_at','status'];
async function productApi(env,method='GET',range='A:G',body){
  const token=await googleToken(env);
  const base=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.SPREADSHEET_ID)}/values/${encodeURIComponent('Products!'+range)}`;
  const url=method==='APPEND'?base+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS':method==='PUT'?base+'?valueInputOption=RAW':base;
  const r=await fetch(url,{method:method==='APPEND'?'POST':method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!r.ok)throw Error('Products Google Sheets request failed ('+r.status+')');return r.json();
}
async function ensureProducts(env){
  const token=await googleToken(env),root=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.SPREADSHEET_ID)}`;
  const headers={authorization:'Bearer '+token,'content-type':'application/json'};
  const info=await fetch(root+'?fields=sheets.properties.title',{headers});
  if(!info.ok)throw Error('Cannot inspect Google Spreadsheet ('+info.status+')');
  const data=await info.json();
  if(!(data.sheets||[]).some(x=>x.properties?.title==='Products')){
    const create=await fetch(root+':batchUpdate',{method:'POST',headers,body:JSON.stringify({requests:[{addSheet:{properties:{title:'Products'}}}]})});
    if(!create.ok){ // Another request may have created the tab at the same time.
      const again=await fetch(root+'?fields=sheets.properties.title',{headers});
      const checked=again.ok?await again.json():{};
      if(!(checked.sheets||[]).some(x=>x.properties?.title==='Products'))throw Error('Cannot create Products worksheet ('+create.status+')');
    }
  }
  const r=await productApi(env);
  if(!(r.values||[]).length){await productApi(env,'PUT','A1:G1',{values:[PRODUCT_HEADERS]});return}
  const existing=r.values[0]||[];
  if(PRODUCT_HEADERS.some((x,i)=>String(existing[i]||'').trim()!==x))throw Error('Products worksheet has different headers. No data was changed; inspect the sheet before proceeding.');
}
function productRows(values){return (values||[]).slice(1).map((r,i)=>({row:i+2,id:r[0]||'',name:r[1]||'',brand:r[2]||'',sku:r[3]||'',created_at:r[4]||'',updated_at:r[5]||'',status:r[6]||'Active'})).filter(x=>x.id&&x.status!=='Deleted')}
function productPayload(b,old){
  const name=String(b.name??old?.name??'').trim(),brand=String(b.brand??old?.brand??'').trim(),sku=String(b.sku??old?.sku??'').trim().toUpperCase();
  if(!name||name.length>200)throw Error('Product name is required (maximum 200 characters)');
  if(!brand||brand.length>120)throw Error('Product brand is required (maximum 120 characters)');
  if(!sku||sku.length>80||!/^[A-Z0-9][A-Z0-9._/-]*$/.test(sku))throw Error('Invalid SKU / Item Code. Use letters, numbers, dot, dash, slash or underscore');
  return {id:old?.id||crypto.randomUUID(),name,brand,sku,created_at:old?.created_at||new Date().toISOString(),updated_at:new Date().toISOString(),status:'Active'};
}
function productValues(p){return [p.id,p.name,p.brand,p.sku,p.created_at,p.updated_at,p.status]}
function cleanSpecial(table,b,r){
  if(!['Invoices','DeliveryNotes'].includes(table))return r;
  const copy=(key,max=300)=>{if(Object.prototype.hasOwnProperty.call(b,key))r[key]=String(b[key]??'').trim().slice(0,max)};
  for(const k of ['seller_name','seller_address','seller_vat','seller_cr','seller_phone','seller_email','buyer_name','buyer_address','buyer_vat','reference_number','sender_name','sender_address','sender_vat','sender_cr','sender_phone','sender_email','receiver_name','receiver_address','receiver_vat','receiver_signature','receiver_date','delivery_instructions'])copy(k,600);
  if(table==='Invoices'){
    if(Object.prototype.hasOwnProperty.call(b,'items')){
      if(!Array.isArray(b.items)||!b.items.length||b.items.length>100)throw Error('Invoice requires 1–100 products');
      r.items=b.items.map(x=>({product_id:String(x.product_id||'').slice(0,80),sku:String(x.sku||'').slice(0,80),brand:String(x.brand||'').slice(0,120),description:String(x.description||'').trim().slice(0,200),quantity:Number(x.quantity),unit_price:Number(x.unit_price)}));
      if(r.items.some(x=>!x.description||!Number.isFinite(x.quantity)||x.quantity<=0||!Number.isFinite(x.unit_price)||x.unit_price<0))throw Error('Invalid invoice quantity or rate');
    }
    if(!r.items?.length)throw Error('Add at least one invoice product');
    if(!r.seller_name?.trim())throw Error('Seller name is required');
    const subtotal=Math.round(r.items.reduce((sum,x)=>sum+x.quantity*x.unit_price,0)*100)/100;
    const vat=Math.round(subtotal*0.15*100)/100;
    r.subtotal=subtotal;r.vat_amount=vat;r.tax_rate=15;r.discount=0;r.amount=Math.round((subtotal+vat)*100)/100;
    r.document_type='Tax Invoice';r.invoice_version=2;
  }else{
    if(Object.prototype.hasOwnProperty.call(b,'items')){
      if(!Array.isArray(b.items)||!b.items.length||b.items.length>100)throw Error('Delivery note requires 1–100 products');
      r.items=b.items.map(x=>({product_id:String(x.product_id||'').slice(0,80),sku:String(x.sku||'').slice(0,80),brand:String(x.brand||'').slice(0,120),description:String(x.description||'').trim().slice(0,200),quantity:Number(x.quantity),unit:String(x.unit||'').trim().slice(0,40),remarks:String(x.remarks||'').slice(0,300),unit_price:0}));
      if(r.items.some(x=>!x.description||!Number.isFinite(x.quantity)||x.quantity<=0||!x.unit))throw Error('Delivery item needs a product, positive quantity and unit');
    }
    if(!r.items?.length)throw Error('Add at least one delivery product');
    if(!r.sender_name?.trim())throw Error('Sender company name is required');
    r.amount=0;r.delivery_version=2;
  }
  return r;
}

function errorStatus(message){return /not found/i.test(message)?404:/permission|not allowed|locked|forbidden/i.test(message)?403:/invalid|required|too many|select|not accessible|brand/i.test(message)?400:500}
export default {async fetch(req,env){const url=new URL(req.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(req):reply({error:'Frontend unavailable'},404);const origin=cors(req,env);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...(origin?{'access-control-allow-origin':origin}:{}),'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'}});if(req.headers.get('Origin')&&!origin)return reply({error:'Origin not allowed'},403);try{
if(url.pathname==='/api/health')return reply({ok:true},200,origin);
if(!env.AUTH_SECRET||!env.USERS_JSON||!env.SPREADSHEET_ID||!env.SERVICE_ACCOUNT_JSON)throw Error('Backend secrets are not configured');
if(url.pathname==='/api/login'&&req.method==='POST'){const b=await req.json(),users=parseJSON(env.USERS_JSON,[]);const u=Array.isArray(users)?users.find(x=>x.username===b.username):null;if(!u||!ROLES[u.role]||!await passwordOK(u,b.password))return reply({error:'Invalid credentials'},401,origin);const p={username:u.username,role:u.role,exp:Date.now()+8*3600000};return reply({token:await sign(p,env.AUTH_SECRET),user:{username:p.username,role:p.role}},200,origin)}
const auth=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');const user=await verify(auth,env.AUTH_SECRET);if(!user||!ROLES[user.role])return reply({error:'Session expired or unauthorized'},401,origin);
if(url.pathname==='/api/me')return reply({user:{username:user.username,role:user.role}},200,origin);

if(url.pathname==='/api/products'||url.pathname.startsWith('/api/products/')){
  const parts=url.pathname.split('/').filter(Boolean),id=parts[2];
  const permission={GET:'read',POST:'create',PATCH:'update',DELETE:'delete'}[req.method];
  if(!permission||!ROLES[user.role].includes(permission))return reply({error:'Permission denied'},403,origin);
  await ensureProducts(env);
  const raw=await productApi(env),products=productRows(raw.values);
  if(req.method==='GET'&&!id){const q=String(url.searchParams.get('q')||'').trim().toLowerCase();return reply({products:products.filter(p=>!q||[p.name,p.brand,p.sku].some(v=>v.toLowerCase().includes(q))).map(({row,...p})=>p)},200,origin)}
  if(req.method==='POST'&&!id){const p=productPayload(await req.json());if(products.some(x=>x.sku.toUpperCase()===p.sku))return reply({error:'SKU / Item Code already exists'},409,origin);await productApi(env,'APPEND','A:G',{values:[productValues(p)]});const logged=await audit(env,user,'create','Products',{id:p.id,reference:p.sku});return reply({product:p,audit_warning:!logged},201,origin)}
  if((req.method==='PATCH'||req.method==='DELETE')&&id){const old=products.find(x=>x.id===id);if(!old)return reply({error:'Product not found'},404,origin);const p=req.method==='DELETE'?{...old,status:'Deleted',updated_at:new Date().toISOString()}:productPayload(await req.json(),old);if(req.method==='PATCH'&&products.some(x=>x.id!==id&&x.sku.toUpperCase()===p.sku))return reply({error:'SKU / Item Code already exists'},409,origin);await productApi(env,'PUT',`A${old.row}:G${old.row}`,{values:[productValues(p)]});const logged=await audit(env,user,req.method==='DELETE'?'archive':'update','Products',{id:p.id,reference:p.sku});return reply({product:p,audit_warning:!logged},200,origin)}
  return reply({error:'Unsupported Products request'},405,origin);
}

if(url.pathname==='/api/overview'&&req.method==='GET'){const all=await Promise.all(TABLES.map(t=>records(env,t)));const counts=Object.fromEntries(TABLES.map((t,i)=>[t,all[i].filter(r=>visible(user,r)).length]));const docs=all.flat().filter(r=>visible(user,r));const recent=docs.sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,8).map(({row,brand_id,...r})=>r);const pending=docs.filter(r=>/pending|unpaid|overdue/i.test(r.status));return reply({counts,recent,notifications:pending.slice(0,8).map(r=>({id:r.id,title:r.reference||r.name,message:r.status+' · '+r.name,table:TABLES.find((t,i)=>all[i].some(x=>x.id===r.id))||'Invoices'})),totals:{amount:docs.filter(r=>DOCS.some(t=>all[TABLES.indexOf(t)].some(x=>x.id===r.id))).reduce((s,r)=>s+Number(r.amount||0),0),pending:pending.length}},200,origin)}
if(url.pathname==='/api/search'&&req.method==='GET'){const q=(url.searchParams.get('q')||'').trim().toLowerCase();if(q.length<2)return reply({results:[]},200,origin);const data=await Promise.all(TABLES.map(t=>records(env,t)));const results=[];for(let i=0;i<TABLES.length;i++)for(const r of data[i])if(visible(user,r)&&[r.name,r.reference,r.status].some(x=>String(x||'').toLowerCase().includes(q))){results.push({id:r.id,table:TABLES[i],name:r.name,reference:r.reference});if(results.length>=40)break}return reply({results:results.slice(0,40)},200,origin)}
if(url.pathname==='/api/audit'&&req.method==='GET'){if(user.role!=='admin')return reply({error:'Permission denied'},403,origin);const data=await sheet(env,'AuditLogs');const events=(data.values||[]).slice(1).map(r=>({id:r[0],table:r[2],record_id:r[3],action:r[4],actor:r[5],date:r[6],reference:r[7]})).slice(-150).reverse();return reply({events},200,origin)}
const parts=url.pathname.split('/').filter(Boolean);if(parts[0]!=='api'||parts[1]!=='records'||!TABLES.includes(parts[2]))return reply({error:'Not found'},404,origin);const table=parts[2],id=parts[3];const permission={GET:'read',POST:'create',PATCH:'update',DELETE:'delete'}[req.method];if(!ROLES[user.role].includes(permission))return reply({error:'Permission denied'},403,origin);
if(req.method==='GET'){const data=await records(env,table);const q=(url.searchParams.get('q')||'').toLowerCase();return reply({records:data.filter(r=>visible(user,r)&&(!q||JSON.stringify(r).toLowerCase().includes(q))).slice(0,1000).map(({row,brand_id,...r})=>r)},200,origin)}
if(req.method==='POST'&&!id){const b=await req.json();if(table==='Clients')validateClient(b);const rec=cleanSpecial(table,b,clean(b,user,null));if(table==='Clients'){rec.name=titleClient(rec.name);rec.status=b.status==='Inactive'?'Inactive':'Active';rec.amount=0;rec.reference='';}if(DOCS.includes(table)&&table!=='PurchaseOrders'){if(!rec.client_id)throw Error('Select a valid client');const cs=await records(env,'Clients');if(!cs.some(c=>c.id===rec.client_id))throw Error('Select a valid client')}if(!rec.reference)rec.reference=(table==='Invoices'?'INV':table==='DeliveryNotes'?'DN':table.slice(0,3).toUpperCase())+'-'+new Date().getUTCFullYear()+'-'+rec.id.slice(0,12).toUpperCase();await sheet(env,table,'APPEND','A:I',{values:[toRow(rec)]});const logged=await audit(env,user,'create',table,rec);return reply({record:rec,audit_warning:!logged},201,origin)}
if((req.method==='PATCH'||req.method==='DELETE')&&id){const data=await records(env,table);const old=data.find(r=>r.id===id&&visible(user,r));if(!old)return reply({error:'Record not found'},404,origin);if(req.method==='DELETE'&&user.role!=='admin')return reply({error:'Permission denied'},403,origin);const b=req.method==='DELETE'?{status:'Deleted'}:await req.json();if(table==='Clients'&&req.method==='PATCH')validateClient({...old,...b});if(user.role!=='admin'&&table==='Clients'&&'name' in b&&b.name!==old.name)return reply({error:'Client name is locked for managers'},403,origin);if(user.role!=='admin'&&DOCS.includes(table)&&(('client_id' in b&&b.client_id!==old.client_id)||('name' in b&&b.name!==old.name)))return reply({error:'Only admin can change the document client/name'},403,origin);if(req.method==='PATCH'&&b.status==='Deleted')return reply({error:'Use delete action to archive'},400,origin);const {row,...original}=old;const rec=((table==='Invoices'&&(original.invoice_version===2||'items' in b))||(table==='DeliveryNotes'&&(original.delivery_version===2||'items' in b)))?cleanSpecial(table,b,clean(b,user,original)):clean(b,user,original);if(table==='Clients'&&req.method==='PATCH'){rec.name=titleClient(rec.name);rec.status=rec.status==='Inactive'?'Inactive':'Active';rec.amount=0;rec.reference='';}if(req.method==='DELETE')rec.status='Deleted';if(DOCS.includes(table)&&table!=='PurchaseOrders'&&rec.client_id){const cs=await records(env,'Clients');if(!cs.some(c=>c.id===rec.client_id))throw Error('Invalid client')}await sheet(env,table,'PUT',`A${row}:I${row}`,{values:[toRow(rec)]});const logged=await audit(env,user,req.method==='DELETE'?'archive':'update',table,rec);return reply({record:rec,audit_warning:!logged},200,origin)}return reply({error:'Unsupported operation'},405,origin)
}catch(e){console.error(e);return reply({error:e.message||'Unexpected server error'},errorStatus(e.message||''),origin)}}};
