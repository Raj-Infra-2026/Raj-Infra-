/** Development-only preflight. NOT a substitute for ZATCA SDK, XSD or Schematron validation. */
export function inspectDraftInvoice(data) {
  const errors = [], warnings = [];
  const requireField = (value, name) => { if (typeof value !== 'string' || !value.trim()) errors.push(`${name} is required`); };
  if (!data || typeof data !== 'object') return {readyForDraft:false,errors:['Invoice data is missing'],warnings};
  if (!['standard','simplified'].includes(data.kind)) errors.push('Invoice kind must be standard or simplified');
  requireField(data.id,'Invoice number');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(data.uuid||''))) errors.push('Invoice UUID must be a valid UUID');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.issueDate||'')) || Number.isNaN(Date.parse(`${data.issueDate}T00:00:00Z`))) errors.push('Valid ISO issue date is required');
  requireField(data.seller?.name,'Seller legal name');
  if (!/^3\d{13}3$/.test(String(data.seller?.vat||''))) errors.push('Seller VAT number must contain 15 digits, beginning and ending with 3');
  if (data.kind==='standard') requireField(data.buyer?.name,'Buyer name for standard invoice');
  if (!Array.isArray(data.items) || !data.items.length) errors.push('At least one line item is required');
  else for (const [i,item] of data.items.entries()) {
    requireField(item.description,`Line ${i+1} description`);
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity)<=0) errors.push(`Line ${i+1} quantity must be positive`);
    if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice)<0) errors.push(`Line ${i+1} unit price must be nonnegative`);
  }
  warnings.push('Seller/buyer national addresses, tax category details, invoice counter, previous invoice hash, signed properties and QR cryptographic tags are not implemented.');
  warnings.push('XML must pass official ZATCA SDK/XSD/Schematron validation and compliance onboarding before issuance.');
  return {readyForDraft:errors.length===0,errors,warnings,validationLevel:'LOCAL_PREFLIGHT_ONLY'};
}
