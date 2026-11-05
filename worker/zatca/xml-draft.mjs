/** Unsigned UBL development draft. Not suitable for legal issuance or ZATCA submission. */
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const e=(name,v,attr='')=>`<${name}${attr}>${esc(v)}</${name}>`;
const sar=(name,v)=>e(name,Number(v).toFixed(2),' currencyID="SAR"');
const round=v=>Math.round((v+Number.EPSILON)*100)/100;
const address=a=>`<cac:PostalAddress>${e('cbc:StreetName',a.street)}${e('cbc:BuildingNumber',a.building)}${e('cbc:CitySubdivisionName',a.district)}${e('cbc:CityName',a.city)}${e('cbc:PostalZone',a.postalCode)}<cac:Country>${e('cbc:IdentificationCode','SA')}</cac:Country></cac:PostalAddress>`;
const party=(p,seller)=>`<cac:Party>${p.address?address(p.address):''}${p.vat?`<cac:PartyTaxScheme>${e('cbc:CompanyID',p.vat)}<cac:TaxScheme>${e('cbc:ID','VAT')}</cac:TaxScheme></cac:PartyTaxScheme>`:''}<cac:PartyLegalEntity>${e('cbc:RegistrationName',p.name||'Customer')}</cac:PartyLegalEntity></cac:Party>`;
export function buildUnsignedInvoiceDraft(data){
 if(!data||!['standard','simplified'].includes(data.kind)) throw Error('Invoice kind must be standard or simplified');
 if(!data.id||!data.uuid||!/^\d{4}-\d{2}-\d{2}$/.test(data.issueDate)) throw Error('Invoice ID, UUID and ISO date required');
 if(!data.seller?.name||!/^3\d{13}3$/.test(String(data.seller.vat||''))) throw Error('Seller name and valid 15 digit VAT required');
 if(!Array.isArray(data.items)||!data.items.length) throw Error('Line items required');
 const lines=data.items.map((x,i)=>{
  if(!x.description||!Number.isFinite(Number(x.quantity))||Number(x.quantity)<=0||!Number.isFinite(Number(x.unitPrice))||Number(x.unitPrice)<0) throw Error(`Invalid invoice line ${i+1}`);
  const rate=x.vatRate===undefined?15:Number(x.vatRate);
  if(rate!==15) throw Error('This development generator only supports 15% standard-rated items');
  const net=round(Number(x.quantity)*Number(x.unitPrice));
  return {id:i+1,description:x.description,quantity:Number(x.quantity),price:Number(x.unitPrice),net,tax:round(net*0.15)};
 });
 const subtotal=round(lines.reduce((s,x)=>s+x.net,0));
 const vat=round(subtotal*0.15),total=round(subtotal+vat);
 const type=data.kind==='standard'?'0100000':'0200000';
 const issueTime=data.issueTime?e('cbc:IssueTime',data.issueTime):'';
 const taxCategory=`<cac:TaxCategory>${e('cbc:ID','S')}${e('cbc:Percent','15.00')}<cac:TaxScheme>${e('cbc:ID','VAT')}</cac:TaxScheme></cac:TaxCategory>`;
 const taxSubtotal=`<cac:TaxSubtotal>${sar('cbc:TaxableAmount',subtotal)}${sar('cbc:TaxAmount',vat)}${taxCategory}</cac:TaxSubtotal>`;
 const lineXml=lines.map(x=>`<cac:InvoiceLine>${e('cbc:ID',x.id)}${e('cbc:InvoicedQuantity',x.quantity,' unitCode="PCE"')}${sar('cbc:LineExtensionAmount',x.net)}<cac:TaxTotal>${sar('cbc:TaxAmount',x.tax)}${sar('cbc:RoundingAmount',round(x.net+x.tax))}</cac:TaxTotal><cac:Item>${e('cbc:Name',x.description)}<cac:ClassifiedTaxCategory>${e('cbc:ID','S')}${e('cbc:Percent','15.00')}<cac:TaxScheme>${e('cbc:ID','VAT')}</cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price>${sar('cbc:PriceAmount',x.price)}</cac:Price></cac:InvoiceLine>`).join('');
 return `<?xml version="1.0" encoding="UTF-8"?>\n<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${e('cbc:ProfileID','reporting:1.0')}${e('cbc:ID',data.id)}${e('cbc:UUID',data.uuid)}${e('cbc:IssueDate',data.issueDate)}${issueTime}<cbc:InvoiceTypeCode name="${type}">388</cbc:InvoiceTypeCode>${e('cbc:DocumentCurrencyCode','SAR')}${e('cbc:TaxCurrencyCode','SAR')}<cac:AccountingSupplierParty>${party(data.seller,true)}</cac:AccountingSupplierParty><cac:AccountingCustomerParty>${party(data.buyer||{},false)}</cac:AccountingCustomerParty><cac:TaxTotal>${sar('cbc:TaxAmount',vat)}${taxSubtotal}</cac:TaxTotal><cac:LegalMonetaryTotal>${sar('cbc:LineExtensionAmount',subtotal)}${sar('cbc:TaxExclusiveAmount',subtotal)}${sar('cbc:TaxInclusiveAmount',total)}${sar('cbc:PayableAmount',total)}</cac:LegalMonetaryTotal>${lineXml}</Invoice>`;
}
