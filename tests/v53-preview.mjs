import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname,join } from 'node:path';
import QR from '../src/vendor/qr/index.js';
import LEVEL from '../src/vendor/qr/QRErrorCorrectLevel.js';
import { buildUnsignedInvoiceDraft } from '../worker/zatca/xml-draft.mjs';

const base=dirname(fileURLToPath(import.meta.url));
// Test the exact preview QR function from the JSX source without requiring React to run.
const source=readFileSync(join(base,'../src/BusinessModules.jsx'),'utf8');
const start=source.indexOf('export function previewInvoiceQrPayload(');
const end=source.indexOf('export const invoiceQrMarkup',start);
assert.ok(start!==-1 && end>start);
const code=source.slice(start,end).replace('export function','function');
const num=n=>Math.round((Number(n)||0)*100)/100;
const invoiceTotals=items=>{const subtotal=num(items.reduce((s,x)=>s+Number(x.quantity)*Number(x.unit_price),0));return {total:num(subtotal*1.15),vat:num(subtotal*.15)}};
const payloadFn=new Function('num','invoiceTotals',`${code}\nreturn previewInvoiceQrPayload;`)(num,invoiceTotals);
const input={seller_name:'Test Seller Company',seller_vat:'300000000000003',date:'2026-11-01',invoice_time:'08:45',items:[{description:'Coffee',quantity:2,unit_price:100}],amount:230,vat_amount:30};
const payload=payloadFn(input,new Date('2026-11-10T09:30:00Z'));
const bytes=Buffer.from(payload,'base64');let offset=0;const tags={};
while(offset<bytes.length){const id=bytes[offset++],length=bytes[offset++];tags[id]=bytes.subarray(offset,offset+length).toString('utf8');offset+=length;}
assert.deepEqual(Object.keys(tags),['1','2','3','4','5']);
assert.equal(tags[1],'Test Seller Company');assert.equal(tags[2],'300000000000003');
assert.equal(tags[3],'2026-11-10T09:30:00Z'); // actual preview generation timestamp, not backdated invoice date
assert.equal(tags[4],'230.00');assert.equal(tags[5],'30.00');
assert.equal(payloadFn({...input,seller_vat:'12345'}),'');
const qr=new QR(0,LEVEL.M);qr.addData(payload);qr.make();assert.ok(qr.getModuleCount()>30);
let marks='';for(let y=0;y<qr.getModuleCount();y++)for(let x=0;x<qr.getModuleCount();x++)if(qr.isDark(y,x))marks+=`<rect x="${x+4}" y="${y+4}" width="1" height="1"/>`;
const size=qr.getModuleCount()+8;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/><g fill="black">${marks}</g></svg>`;
if(process.env.GENERATE_DEMO_SVG)writeFileSync(join(base,'../samples/DEMO_QR.svg'),svg);
const xml=buildUnsignedInvoiceDraft({kind:'standard',id:'DEMO-INVOICE',uuid:'11111111-1111-4111-8111-111111111111',issueDate:input.date,issueTime:'08:45:00',seller:{name:input.seller_name,vat:input.seller_vat},buyer:{name:'Test Buyer'},items:[{description:'Coffee',quantity:2,unitPrice:100,vatRate:15}]});
assert.match(xml,/<cbc:IssueDate>2026-11-01<\/cbc:IssueDate>/);
assert.match(xml,/<cac:AccountingSupplierParty>/);
assert.doesNotMatch(xml,/<ds:Signature\b/);
console.log('PASS V5.3: demo TLV QR tags, preview timestamp, VAT checks, QR matrix and unsigned XML');
