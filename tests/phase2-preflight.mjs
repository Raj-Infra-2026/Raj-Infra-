import assert from 'node:assert/strict';
import {checkInvoiceData,checkSigningReadiness} from '../worker/zatca/phase2-preflight.mjs';
import {buildUnsignedInvoiceDraft} from '../worker/zatca/xml-draft.mjs';
const d={kind:'standard',id:'INV-1',uuid:'123e4567-e89b-42d3-a456-426614174000',issueDate:'2026-11-10',issueTime:'12:00:00',icv:1,pih:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',seller:{name:'DEMO ONLY',vat:'300000000000003',id:'1234567890',address:{street:'Example Street',building:'1234',district:'Demo',city:'Jeddah',postalCode:'23521'}},buyer:{name:'Buyer',vat:'300000000000003',address:{street:'Example Street',building:'1234',district:'Demo',city:'Jeddah',postalCode:'23521'}},items:[{description:'Service',quantity:1,unitPrice:100}]};
assert.equal(checkInvoiceData(d).passed,true);
for(const kind of ['standard','simplified']){
 const invoice={...d,kind};
 const xml=buildUnsignedInvoiceDraft(invoice);
 assert.ok(xml.includes(`name="${kind==='standard'?'0100000':'0200000'}"`));
 const readiness=checkSigningReadiness({invoice});
 assert.equal(readiness.passed,false);
 assert.ok(readiness.errors.includes('validation.officialSdkNotPassed'));
 assert.equal(readiness.issuanceEnabled,false);
}
assert.ok(checkInvoiceData({...d,seller:{...d.seller,vat:'BAD'}}).errors.includes('seller.vat'));
console.log('PASS B2B/B2C XML + strict preflight + fail-closed signing/SDK gate');
