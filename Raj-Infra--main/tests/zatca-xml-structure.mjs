import assert from 'node:assert/strict';
import {buildUnsignedInvoiceDraft} from '../worker/zatca/xml-draft.mjs';
const base={kind:'standard',id:'INV-001',uuid:'123e4567-e89b-42d3-a456-426614174000',issueDate:'2026-11-05',seller:{name:'Seller & Co',vat:'300000000000003',address:{street:'King Road',building:'1234',district:'Center',city:'Jeddah',postalCode:'12345'}},buyer:{name:'Buyer Ltd'},items:[{description:'Service <A>',quantity:2,unitPrice:100}]};
const x=buildUnsignedInvoiceDraft(base);
for(const s of ['<cac:TaxSubtotal>','<cac:ClassifiedTaxCategory>','<cbc:TaxAmount currencyID="SAR">30.00</cbc:TaxAmount>','<cbc:PayableAmount currencyID="SAR">230.00</cbc:PayableAmount>','Seller &amp; Co','Service &lt;A&gt;','<cac:PostalAddress>']) assert.ok(x.includes(s),s);
assert.throws(()=>buildUnsignedInvoiceDraft({...base,items:[{description:'x',quantity:1,unitPrice:1,vatRate:0}]}),/only supports 15%/);
console.log('ZATCA unsigned XML structure smoke tests passed');
