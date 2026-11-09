/** Local structural preflight only; NOT a ZATCA SDK/XSD/Schematron conformance result. */
export function inspectDraftInvoice(data) {
 const errors=[],warnings=[];
 const required=(v,name)=>{if(typeof v!=='string'||!v.trim())errors.push(`${name} is required`)};
 if(!data||typeof data!=='object')return {readyForDraft:false,errors:['Invoice data missing'],warnings,validationLevel:'LOCAL_PREFLIGHT_ONLY'};
 if(!['standard','simplified'].includes(data.kind))errors.push('Invoice kind must be standard or simplified');
 required(data.id,'Invoice number');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(data.uuid||'')))errors.push('Valid invoice UUID required');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(data.issueDate||''))||Number.isNaN(Date.parse(`${data.issueDate}T00:00:00Z`)))errors.push('Genuine ISO invoice issue date required');
 if(!/^\d{2}:\d{2}:\d{2}$/.test(String(data.issueTime||'')))errors.push('Actual issuance time HH:mm:ss required');
 required(data.seller?.name,'Seller registered legal name');
 if(!/^3\d{13}3$/.test(String(data.seller?.vat||'')))errors.push('Valid seller VAT required');
 for(const k of ['street','building','district','city','postalCode'])required(data.seller?.address?.[k],`Seller national address ${k}`);
 if(data.kind==='standard')required(data.buyer?.name,'Buyer registered name');
 if(!Number.isSafeInteger(data.icv)||data.icv<1)errors.push('Reserved positive ICV required');
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(String(data.pih||'')))errors.push('Previous invoice hash PIH required');
 if(!Array.isArray(data.items)||!data.items.length)errors.push('At least one invoice line required');
 else for(const [i,item] of data.items.entries()){
  required(item.description,`Line ${i+1} description`);
  if(!Number.isFinite(Number(item.quantity))||Number(item.quantity)<=0)errors.push(`Line ${i+1} quantity must be positive`);
  if(!Number.isFinite(Number(item.unitPrice))||Number(item.unitPrice)<0)errors.push(`Line ${i+1} unit price must be nonnegative`);
  if(item.vatRate!==undefined&&Number(item.vatRate)!==15)errors.push(`Line ${i+1}: this generator only supports standard 15% VAT`);
 }
 warnings.push('This generator covers only a subset of ZATCA invoice cases (SAR, normal invoice 388, standard 15% VAT, no discounts/advance payments/notes).');
 warnings.push('XAdES signed extension, C14N 1.1, official certificate chain, exact hash calculation and QR integration remain dependent on official SDK/profile validation.');
 warnings.push('This is NOT ZATCA validation or proof of clearance/reporting. Production issuance remains blocked.');
 return {readyForDraft:!errors.length,errors,warnings,validationLevel:'LOCAL_PREFLIGHT_ONLY'};
}
