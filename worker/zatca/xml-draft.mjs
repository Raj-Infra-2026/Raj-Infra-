/** UBL 2.1 invoice producer for the supported SAR, 15% standard-rated scenario.
 * Not a substitute for official ZATCA SDK, XSD/Schematron validation, CSID signing,
 * clearance, address/business-rule verification or a durable issuance ledger.
 */
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const e=(name,v,attr='')=>`<${name}${attr}>${esc(v)}</${name}>`;
const sar=(name,v)=>e(name,Number(v).toFixed(2),' currencyID="SAR"');
const round=v=>Math.round((v+Number.EPSILON)*100)/100;
const address=a=>`<cac:PostalAddress>${e('cbc:StreetName',a.street)}${e('cbc:BuildingNumber',a.building)}${e('cbc:CitySubdivisionName',a.district)}${e('cbc:CityName',a.city)}${e('cbc:PostalZone',a.postalCode)}<cac:Country>${e('cbc:IdentificationCode','SA')}</cac:Country></cac:PostalAddress>`;
const party=(p,seller)=>`<cac:Party>${p.id?`<cac:PartyIdentification>${e('cbc:ID',p.id,` schemeID="${esc(p.idScheme||'CRN')}"`)}</cac:PartyIdentification>`:''}${p.address?address(p.address):''}${p.vat?`<cac:PartyTaxScheme>${e('cbc:CompanyID',p.vat)}<cac:TaxScheme>${e('cbc:ID','VAT')}</cac:TaxScheme></cac:PartyTaxScheme>`:''}<cac:PartyLegalEntity>${e('cbc:RegistrationName',p.name||'Customer')}</cac:PartyLegalEntity></cac:Party>`;
const taxCategory=`<cac:TaxCategory>${e('cbc:ID','S')}${e('cbc:Percent','15.00')}<cac:TaxScheme>${e('cbc:ID','VAT')}</cac:TaxScheme></cac:TaxCategory>`;
export function buildUnsignedInvoiceDraft(data){
 if(!data||!['standard','simplified'].includes(data.kind))throw Error('Invoice kind must be standard or simplified');
 if(!data.id||!data.uuid||!/^\d{4}-\d{2}-\d{2}$/.test(data.issueDate))throw Error('Invoice ID, UUID and ISO date required');
 if(!data.seller?.name||!/^3\d{13}3$/.test(String(data.seller.vat||'')))throw Error('Seller name and valid 15 digit VAT required');
 if(!Array.isArray(data.items)||!data.items.length)throw Error('Line items required');
 if(data.icv!==undefined&&(!Number.isSafeInteger(data.icv)||data.icv<1))throw Error('Positive integer ICV required');
 if(data.icv!==undefined&&!data.pih)throw Error('PIH required when using invoice counter');
 if(data.pih&&(!/^[A-Za-z0-9+/]+={0,2}$/.test(data.pih)||!Buffer.from(data.pih,'base64').length))throw Error('Invalid PIH');
 const lines=data.items.map((x,i)=>{
  if(!x.description||!Number.isFinite(Number(x.quantity))||Number(x.quantity)<=0||!Number.isFinite(Number(x.unitPrice))||Number(x.unitPrice)<0)throw Error(`Invalid invoice line ${i+1}`);
  const rate=x.vatRate===undefined?15:Number(x.vatRate);
  if(rate!==15)throw Error('This development generator only supports 15% standard-rated items');
  const net=round(Number(x.quantity)*Number(x.unitPrice));return {id:i+1,description:x.description,quantity:Number(x.quantity),price:Number(x.unitPrice),net,tax:round(net*0.15),unitCode:x.unitCode||'PCE'};
 });
 const subtotal=round(lines.reduce((s,x)=>s+x.net,0)),vat=round(subtotal*0.15),total=round(subtotal+vat);
 const type=data.kind==='standard'?'0100000':'0200000';
 const issueTime=data.issueTime?e('cbc:IssueTime',data.issueTime):'';
 const taxSubtotal=`<cac:TaxSubtotal>${sar('cbc:TaxableAmount',subtotal)}${sar('cbc:TaxAmount',vat)}${taxCategory}</cac:TaxSubtotal>`;
 const linesXml=lines.map(x=>`<cac:InvoiceLine>${e('cbc:ID',x.id)}${e('cbc:InvoicedQuantity',x.quantity,` unitCode="${esc(x.unitCode)}"`)}${sar('cbc:LineExtensionAmount',x.net)}<cac:TaxTotal>${sar('cbc:TaxAmount',x.tax)}${sar('cbc:RoundingAmount',round(x.net+x.tax))}</cac:TaxTotal><cac:Item>${e('cbc:Name',x.description)}<cac:ClassifiedTaxCategory>${e('cbc:ID','S')}${e('cbc:Percent','15.00')}<cac:TaxScheme>${e('cbc:ID','VAT')}</cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price>${sar('cbc:PriceAmount',x.price)}</cac:Price></cac:InvoiceLine>`).join('');
 const icv=data.icv!==undefined?`<cac:AdditionalDocumentReference>${e('cbc:ID','ICV')}${e('cbc:UUID',data.icv)}</cac:AdditionalDocumentReference>`:'';
 const pih=data.pih?`<cac:AdditionalDocumentReference>${e('cbc:ID','PIH')}<cac:Attachment>${e('cbc:EmbeddedDocumentBinaryObject',data.pih,' mimeCode="text/plain"')}</cac:Attachment></cac:AdditionalDocumentReference>`:'';
 const qr=data.qr?`<cac:AdditionalDocumentReference>${e('cbc:ID','QR')}<cac:Attachment>${e('cbc:EmbeddedDocumentBinaryObject',data.qr,' mimeCode="text/plain"')}</cac:Attachment></cac:AdditionalDocumentReference>`:'';
 const seller=party(data.seller,true),buyer=party(data.buyer||{},false);
 const payment=data.paymentMeansCode?`<cac:PaymentMeans>${e('cbc:PaymentMeansCode',data.paymentMeansCode)}</cac:PaymentMeans>`:'';
 return `<?xml version="1.0" encoding="UTF-8"?>\n<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">${e('cbc:ProfileID','reporting:1.0')}${e('cbc:ID',data.id)}${e('cbc:UUID',data.uuid)}${e('cbc:IssueDate',data.issueDate)}${issueTime}<cbc:InvoiceTypeCode name="${type}">388</cbc:InvoiceTypeCode>${e('cbc:DocumentCurrencyCode','SAR')}${e('cbc:TaxCurrencyCode','SAR')}${icv}${pih}${qr}<cac:AccountingSupplierParty>${seller}</cac:AccountingSupplierParty><cac:AccountingCustomerParty>${buyer}</cac:AccountingCustomerParty>${payment}<cac:TaxTotal>${sar('cbc:TaxAmount',vat)}${taxSubtotal}</cac:TaxTotal><cac:LegalMonetaryTotal>${sar('cbc:LineExtensionAmount',subtotal)}${sar('cbc:TaxExclusiveAmount',subtotal)}${sar('cbc:TaxInclusiveAmount',total)}${sar('cbc:PayableAmount',total)}</cac:LegalMonetaryTotal>${linesXml}</Invoice>`;
}
