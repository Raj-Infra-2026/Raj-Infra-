import assert from 'node:assert/strict';
import {buildUnsignedInvoiceDraft} from '../worker/zatca/xml-draft.mjs';
const value=buildUnsignedInvoiceDraft({kind:'standard',id:'DRAFT-1',uuid:'123e4567-e89b-12d3-a456-426614174000',issueDate:'2026-11-05',seller:{name:'شركة ألف & مختبر',vat:'300000000000003'},buyer:{name:'Customer'},items:[{description:'Consulting <Service>',quantity:2,unitPrice:100}]});
assert.match(value,/&amp;/);assert.match(value,/&lt;Service&gt;/);assert.match(value,/230\.00/);assert.match(value,/InvoiceTypeCode name="0100000"/);
assert.throws(()=>buildUnsignedInvoiceDraft({kind:'standard'}));
console.log('Unsigned XML draft smoke tests passed');
