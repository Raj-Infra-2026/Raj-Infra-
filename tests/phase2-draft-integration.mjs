import assert from 'node:assert/strict';
import {createDraftInvoiceXml,createPhase2ReadinessReport} from '../src/zatcaPreview.js';
const doc={date:'2026-11-10',seller_name:'Demo Seller',seller_vat:'300000000000003',buyer_name:'Demo Buyer',buyer_vat:'300000000000003',reference:'DEMO-1',items:[{description:'Test service',quantity:1,unit_price:100}],adjustments:[]};
for(const [kind,code] of [['standard','0100000'],['simplified','0200000']]){
 const xml=createDraftInvoiceXml(doc,kind);
 assert.ok(xml.includes(`name="${code}"`));
 assert.ok(xml.includes('NOT ISSUED'));
 const report=createPhase2ReadinessReport(doc,kind);
 assert.equal(report.phase2Verified,false);
 assert.equal(report.officialSubmission,false);
 assert.ok(report.errors.includes('production-csid'));
 assert.ok(report.errors.includes('qr-cryptographic-tags'));
 console.log(`PASS ${kind}: draft XML, blocked issuance, readiness checks`);
}
assert.throws(()=>createDraftInvoiceXml(doc,'unknown'));
