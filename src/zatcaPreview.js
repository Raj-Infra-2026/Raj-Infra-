/** Unsigned, non-issued UBL XML workbench. Never sends to ZATCA or performs ICV issuance. */
import { buildUnsignedInvoiceDraft } from '../worker/zatca/xml-draft.mjs';

const clean = x => String(x ?? '').trim();
function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  throw Error('A secure browser context is required for generating a draft UUID.');
}

export function createDraftInvoiceXml(doc) {
  if (!doc || !/^\d{4}-\d{2}-\d{2}$/.test(clean(doc.date))) throw Error('Choose a valid invoice date.');
  if (!/^3\d{13}3$/.test(clean(doc.seller_vat))) throw Error('A valid 15-digit Saudi seller VAT number is required (starts and ends with 3).');
  if (!clean(doc.seller_name)) throw Error('Enter the registered seller company name.');
  if ((doc.adjustments || []).some(a => Number(a.amount))) throw Error('Draft XML currently supports invoices without extra charges or deductions; remove adjustments before exporting XML.');
  const items = (doc.items || []).map(x => ({
    description: clean(x.description), quantity: Number(x.quantity), unitPrice: Number(x.unit_price), vatRate:15, unitCode:'PCE'
  }));
  if (!items.length) throw Error('Add at least one invoice line item.');
  const source = {
    kind:'standard', id: clean(doc.reference) || 'DEMO-NOT-ISSUED', uuid:uid(),
    issueDate:doc.date, issueTime:/^\d\d:\d\d$/.test(clean(doc.invoice_time)) ? `${doc.invoice_time}:00` : undefined,
    seller:{name:clean(doc.seller_name),vat:clean(doc.seller_vat)},
    buyer:{name:clean(doc.buyer_name || doc.name) || 'Demo buyer',vat:clean(doc.buyer_vat) || undefined},
    items
  };
  const xml=buildUnsignedInvoiceDraft(source);
  return xml.replace('<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml version="1.0" encoding="UTF-8"?>\n<!-- ALIF SYNC DEMO DRAFT - UNSIGNED - NOT ISSUED - NOT SUBMITTED OR CLEARED BY ZATCA -->');
}
export function downloadDraftInvoiceXml(doc) {
  const xml=createDraftInvoiceXml(doc);
  const file=new Blob([xml],{type:'application/xml;charset=utf-8'});
  const url=URL.createObjectURL(file);
  try {
    const link=document.createElement('a'); link.href=url;
    link.download=`DRAFT_${clean(doc.reference || doc.date || 'invoice').replace(/[^a-z0-9_-]/gi,'_')}.xml`;
    document.body.appendChild(link);link.click();link.remove();
  } finally { setTimeout(()=>URL.revokeObjectURL(url),60000); }
  return xml;
}
