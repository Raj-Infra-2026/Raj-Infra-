/** Strict local readiness gate. No API requests, no issuance, no keys in browser.
 * This is NOT a replacement for the official ZATCA SDK or XAdES implementation.
 */
const VAT=/^3\d{13}3$/;
const CR=/^\d{10}$/;
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const addr=a=>a&&['street','building','district','city','postalCode'].every(k=>typeof a[k]==='string'&&a[k].trim())&&/^\d{5}$/.test(a.postalCode);
export function checkInvoiceData(d){
 const errors=[];
 if(!['standard','simplified'].includes(d?.kind))errors.push('invoice.kind');
 if(!d?.id||!String(d.id).trim())errors.push('invoice.id');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d?.uuid||''))errors.push('invoice.uuid');
 if(!isDate(d?.issueDate))errors.push('invoice.issueDate');
 if(!/^\d{2}:\d{2}:\d{2}$/.test(d?.issueTime||''))errors.push('invoice.issueTime');
 if(!d?.seller?.name?.trim())errors.push('seller.name');
 if(!VAT.test(d?.seller?.vat||''))errors.push('seller.vat');
 if(!CR.test(d?.seller?.id||''))errors.push('seller.cr');
 if(!addr(d?.seller?.address))errors.push('seller.address');
 if(d?.kind==='standard'){
  if(!d?.buyer?.name?.trim())errors.push('buyer.name');
  if(!VAT.test(d?.buyer?.vat||''))errors.push('buyer.vat');
  if(!addr(d?.buyer?.address))errors.push('buyer.address');
 }
 if(!Number.isSafeInteger(d?.icv)||d.icv<1)errors.push('chain.icv');
 if(!/^[A-Za-z0-9+/]{43}=$/.test(d?.pih||''))errors.push('chain.pih');
 if(!Array.isArray(d?.items)||!d.items.length)errors.push('items');
 else d.items.forEach((x,i)=>{
  if(!x?.description?.trim()||!Number.isFinite(Number(x.quantity))||Number(x.quantity)<=0||!Number.isFinite(Number(x.unitPrice))||Number(x.unitPrice)<0)errors.push(`items.${i}`);
  if(x?.vatRate!==undefined&&Number(x.vatRate)!==15)errors.push(`items.${i}.vatRateUnsupported`);
 });
 if(d?.adjustments?.some(x=>Number(x.amount)!==0))errors.push('adjustments.notSupported');
 return {passed:errors.length===0,errors,checks:'ALIF_LABS_LOCAL_DATA_PREFLIGHT_ONLY',authorityValidated:false};
}
export function checkSigningReadiness({invoice,credentials,signingResult,validationResult}={}){
 const errors=[...checkInvoiceData(invoice).errors];
 if(!credentials?.certificatePem)errors.push('signing.certificateMissing');
 if(!credentials?.authorizedKeyRef)errors.push('signing.authorizedKeyMissing');
 if(!signingResult?.xadesVerified)errors.push('signing.xadesNotVerified');
 if(!signingResult?.zatcaCanonicalHashVerified)errors.push('signing.zatcaHashNotVerified');
 if(!signingResult?.qrVerified)errors.push('signing.qrNotVerified');
 if(!validationResult?.officialSdkPassed)errors.push('validation.officialSdkNotPassed');
 return {passed:errors.length===0,errors,authorityValidated:false,issuanceEnabled:false,
  note:'Local checks only. Official ZATCA clearance/reporting is not performed.'};
}
