/** Unsigned, non-issued UBL XML workbench. Never sends to ZATCA or performs ICV issuance. */
import { buildUnsignedInvoiceDraft } from '../worker/zatca/xml-draft.mjs';

const clean = x => String(x ?? '').trim();
function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  throw Error('A secure browser context is required for generating a draft UUID.');
}

export function createDraftInvoiceXml(doc, kind = 'standard') {
  if (!['standard', 'simplified'].includes(kind)) throw Error('Choose B2B standard or B2C simplified.');
  if (!doc || !/^\d{4}-\d{2}-\d{2}$/.test(clean(doc.date))) throw Error('Choose a valid invoice date.');
  if (!/^3\d{13}3$/.test(clean(doc.seller_vat))) throw Error('A valid 15-digit Saudi seller VAT number is required (starts and ends with 3).');
  if (!clean(doc.seller_name)) throw Error('Enter the registered seller company name.');
  if ((doc.adjustments || []).some(a => Number(a.amount))) throw Error('Draft XML currently supports invoices without extra charges or deductions; remove adjustments before exporting XML.');
  const items = (doc.items || []).map(x => ({
    description: clean(x.description), quantity: Number(x.quantity), unitPrice: Number(x.unit_price), vatRate:15, unitCode:'PCE'
  }));
  if (!items.length) throw Error('Add at least one invoice line item.');
  const source = {
    kind, id: clean(doc.reference) || 'DEMO-NOT-ISSUED', uuid:uid(),
    issueDate:doc.date, issueTime:/^\d\d:\d\d$/.test(clean(doc.invoice_time)) ? `${doc.invoice_time}:00` : undefined,
    seller:{name:clean(doc.seller_name),vat:clean(doc.seller_vat)},
    buyer:{name:clean(doc.buyer_name || doc.name) || 'Demo buyer',vat:clean(doc.buyer_vat) || undefined},
    items
  };
  const xml=buildUnsignedInvoiceDraft(source);
  return xml.replace('<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml version="1.0" encoding="UTF-8"?>\n<!-- ALIF LABS DEMO DRAFT - UNSIGNED - NOT ISSUED - NOT SUBMITTED OR CLEARED BY ZATCA -->');
}
export function downloadDraftInvoiceXml(doc, kind = 'standard') {
  const xml=createDraftInvoiceXml(doc, kind);
  const file=new Blob([xml],{type:'application/xml;charset=utf-8'});
  const url=URL.createObjectURL(file);
  try {
    const link=document.createElement('a'); link.href=url;
    link.download=`DRAFT_${kind.toUpperCase()}_${clean(doc.reference || doc.date || 'invoice').replace(/[^a-z0-9_-]/gi,'_')}.xml`;
    document.body.appendChild(link);link.click();link.remove();
  } finally { setTimeout(()=>URL.revokeObjectURL(url),60000); }
  return xml;
}

/** Readiness diagnostics are intentionally independent from QR appearance.
 * No signed QR is produced without a verified CSID/XAdES signing workflow.
 */
export function createPhase2ReadinessReport(doc, kind = 'standard') {
  if (!['standard', 'simplified'].includes(kind)) throw Error('Invalid invoice kind');
  const checks = [
    { id:'seller-name', ok:!!clean(doc?.seller_name), detail:'Registered seller name' },
    { id:'seller-vat-format', ok:/^3\d{13}3$/.test(clean(doc?.seller_vat)), detail:'15-digit VAT number format only; not a registration check' },
    { id:'invoice-date', ok:/^\d{4}-\d{2}-\d{2}$/.test(clean(doc?.date)), detail:'Document date is not the issuance timestamp' },
    { id:'line-items', ok:Array.isArray(doc?.items) && doc.items.length>0 && doc.items.every(x=>clean(x.description)&&Number(x.quantity)>0&&Number(x.unit_price)>=0), detail:'Valid line items' },
    { id:'adjustments', ok:!(doc?.adjustments||[]).some(x=>Number(x.amount)), detail:'Prototype only supports zero adjustments' },
    { id:'buyer-vat', ok:kind==='simplified'||/^3\d{13}3$/.test(clean(doc?.buyer_vat)), detail:'B2B buyer VAT required by this readiness profile' },
    { id:'production-csid', ok:false, detail:'A valid ZATCA production CSID must be provisioned server-side' },
    { id:'xades-signature', ok:false, detail:'ZATCA XAdES and canonical XML hash have not been generated' },
    { id:'qr-cryptographic-tags', ok:false, detail:kind==='simplified'?'B2C requires verified signed QR tags 6–9':'B2B final QR must come from ZATCA clearance' },
    { id:'zatca-integration', ok:false, detail:kind==='simplified'?'B2C reporting has not occurred':'B2B clearance has not occurred' }
  ];
  return { product:'ALIF LABS', profile:kind==='standard'?'B2B_STANDARD':'B2C_SIMPLIFIED',
    documentStatus:'DRAFT_NOT_A_TAX_INVOICE', phase2Verified:false, officialSubmission:false,
    checks, errors:checks.filter(x=>!x.ok).map(x=>x.id),
    note:'This report is not a ZATCA SDK validation or an approval. QR tags 1–5 alone are insufficient for Phase 2.' };
}
export function downloadPhase2ReadinessReport(doc, kind = 'standard') {
  const report=createPhase2ReadinessReport(doc,kind);
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  try {const a=document.createElement('a');a.href=url;a.download=`DRAFT_${kind.toUpperCase()}_PHASE2_READINESS.json`;document.body.appendChild(a);a.click();a.remove();}
  finally {setTimeout(()=>URL.revokeObjectURL(url),60000);}
  return report;
}
