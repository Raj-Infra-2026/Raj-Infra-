/** ALIF SYNC V5.3 — A4 bilingual invoice render, shared by Preview and Download.
 * Uses a browser-rendered canvas PDF. A preview is NEVER an issued tax invoice.
 * Do not use a browser-generated demo QR as evidence of ZATCA Phase 2 acceptance.
 */
const pdfDate = value => { const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(value||''));return m?`${m[3]}/${m[2]}/${m[1]}`:(value||'—'); };
const SAR = n=>'SAR '+Number(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const round = n=>Math.round((Number(n)||0)*100)/100;
const clean = v=>String(v??'').trim();
// Avoid repeating automatically generated payment summaries when a saved invoice
// already includes one and the UI appends the latest summary again.
const uniqueNotes = value => {
  const raw=clean(value);
  if(!raw)return '';
  const payment=/Amount paid:\s*SAR\s*[\d,]+(?:\.\d{2})?\.\s*Pending balance:\s*SAR\s*[\d,]+(?:\.\d{2})?\./gi;
  const matches=[...raw.matchAll(payment)];
  if(!matches.length)return raw;
  const latest=matches[matches.length-1][0].trim();
  const other=raw.replace(payment,'').split('\n').map(t=>t.trim()).filter(Boolean).join('\n');
  return [other,latest].filter(Boolean).join('\n');
};
const moneyWords = value => {
  const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function say(n){n=Math.floor(n);if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+say(n%10):'');if(n<1000)return say(Math.floor(n/100))+' hundred'+(n%100?' '+say(n%100):'');if(n<1e6)return say(Math.floor(n/1000))+' thousand'+(n%1000?' '+say(n%1000):'');if(n<1e9)return say(Math.floor(n/1e6))+' million'+(n%1e6?' '+say(n%1e6):'');return String(n);}
  const r=Math.floor(Number(value)||0),h=Math.round(((Number(value)||0)-r)*100);return (say(r)+' Saudi riyals'+(h?' and '+say(h)+' halalas':'')+' only').replace(/\b[a-z]/g, c => c.toUpperCase());
};

function makePdf(jpegs){
  const encoder=new TextEncoder(),parts=[];let len=0;const offsets=[];
  const push=b=>{const data=typeof b==='string'?encoder.encode(b):b;parts.push(data);len+=data.length};
  const obj=(id,data)=>{offsets[id]=len;push(`${id} 0 obj\n`);push(data);push('\nendobj\n')};
  push('%PDF-1.4\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,`<< /Type /Pages /Kids [ ${jpegs.map((_,i)=>3+3*i+' 0 R').join(' ')} ] /Count ${jpegs.length} >>`);
  jpegs.forEach((jpeg,i)=>{
    const p=3+i*3,img=p+1,stream=p+2;
    obj(p,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /I${i} ${img} 0 R >> >> /Contents ${stream} 0 R >>`);
    offsets[img]=len;push(`${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);push(jpeg);push('\nendstream\nendobj\n');
    const content=`q 595.28 0 0 841.89 0 0 cm /I${i} Do Q`;
    obj(stream,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  const xref=len;push(`xref\n0 ${3+jpegs.length*3}\n0000000000 65535 f \n`);
  for(let i=1;i<=jpegs.length*3+2;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
  push(`trailer\n<< /Size ${3+jpegs.length*3} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts,{type:'application/pdf'});
}
const COLORS={ink:'#171717',gray:'#555555',muted:'#777777',rule:'#d9d9d9',light:'#f5f5f5',brand:'#3763a3',warn:'#8a3b28'};
const W=1240,H=1754,margin=64,right=W-margin;
async function loadImage(src){
  if(!src)return null;
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src});
  return img;
}

export async function createDocumentPdfFile(doc,kind='Invoices',qrMarkup='',mode='preview'){
  const invoice=kind==='Invoices',proforma=kind==='ProformaInvoices';
  const title=invoice?'TAX INVOICE':proforma?'PROFORMA INVOICE':kind==='DeliveryNotes'?'DELIVERY NOTE':kind==='Quotations'?'QUOTATION':kind==='ClientPOs'?'CLIENT PURCHASE ORDER':'PURCHASE ORDER';
  const arabic=invoice?'فاتورة ضريبية':proforma?'فاتورة أولية':kind==='DeliveryNotes'?'إشعار تسليم':kind==='Quotations'?'عرض سعر':'';
  const draft=invoice && mode === 'preview';
  const items=Array.isArray(doc.items)?doc.items:[];
  const subtotal=round(items.reduce((n,x)=>n+Number(x.quantity||0)*Number(x.unit_price||0),0));
  const vat=round(doc.vat_amount??subtotal*.15), adjustments=(doc.adjustments||[]).map(a=>({...a, signed:['Deduction','Retention'].includes(a.type)?-Math.abs(Number(a.amount||0)):Number(a.amount||0)}));
  const total=round(doc.amount??subtotal+vat+adjustments.reduce((n,a)=>n+a.signed,0));
  let logo=null,qr=null;
  if(/^data:image\/(?:png|jpeg|webp);base64,/.test(doc.company_logo||'')){try{logo=await loadImage(doc.company_logo)}catch{/* logo optional */}}
  if(invoice && qrMarkup){try{qr=await loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrMarkup))}catch(e){throw Error('Invoice QR could not render in the PDF: '+e.message)}}
  const jpegPages=[];let ctx,y,page=0;
  const font=(size=20,bold=false,arabic=false)=>`${bold?'700 ':'400 '}${size}px ${arabic?'"Noto Naskh Arabic",Tahoma,Arial':'Arial,"Noto Sans Arabic",sans-serif'}`;
  const label=(text,x,yy,size=17,bold=false,color=COLORS.ink,align='left',ar=false)=>{
    ctx.save();ctx.fillStyle=color;ctx.font=font(size,bold,ar);ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.direction=ar?'rtl':'ltr';ctx.fillText(clean(text),x,yy);ctx.restore();
  };
  function wrapText(str,x,yy,maxWidth,size=20,bold=false,color=COLORS.ink,lineH=size+8,maxLines=100){
    ctx.font=font(size,bold);let count=0;
    for(const line of clean(str).replace(/\r/g,'').split('\n')){
      let words=line.split(/\s+/),buffer='';
      for(const word of words){
        const joined=buffer?buffer+' '+word:word;
        if(ctx.measureText(joined).width>maxWidth && buffer){label(buffer,x,yy,size,bold,color);yy+=lineH;count++;buffer=word;if(count>=maxLines)return yy;}
        else buffer=joined;
      }
      if(buffer){label(buffer,x,yy,size,bold,color);yy+=lineH;count++;if(count>=maxLines)return yy;}
    }
    return yy;
  }
  function rect(x,yy,w,h,fill=COLORS.light,stroke=COLORS.rule){ctx.fillStyle=fill;ctx.fillRect(x,yy,w,h);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.strokeRect(x,yy,w,h)}}
  function line(x,yy,end){ctx.strokeStyle=COLORS.rule;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(end,yy);ctx.stroke()}
  function basePage(){
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
    page++;ctx.fillStyle='#c92828';ctx.fillRect(margin,H-118,W-margin*2,3);
    label(doc.seller_address||'',W/2,H-91,15,false,COLORS.gray,'center');
    label([doc.seller_email,doc.seller_website].filter(Boolean).join('  |  '),W/2,H-64,15,false,COLORS.gray,'center');
    label(`Page ${page}`,right,H-38,13,false,COLORS.gray,'right');
    y=140;
    return canvas;
  }
  let canvas=basePage();
  function capture(){const jpg=canvas.toDataURL('image/jpeg',0.97).split(',')[1],bin=atob(jpg),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);jpegPages.push(bytes)}
  function nextPage(){capture();canvas=basePage();return canvas}
  // Faithful A4 reference layout: bilingual identity, centered logo, blue grid and total.
  // Seller identity appears ONLY in the header, never in a second seller panel.
  const BLUE='#3763a3', INK='#171717', LIGHT='#d9dde4';
  const left=margin, contentW=right-margin;
  const rightText=(t,x,yy,size=17,bold=false,color=INK)=>label(t,x,yy,size,bold,color,'right');
  const short=(s,n=70)=>clean(s).slice(0,n);
  const heading=invoice?'Tax Invoice - فاتورة ضريبية':proforma?'Proforma Invoice - الفاتورة الأولية':title+(arabic?' - '+arabic:'');
  // Company identity — same positions as the reference page.
  label(short(doc.seller_name||doc.sender_name||'Company',42),left,100,22,true);
  if(doc.seller_cr)label('C.R.: '+doc.seller_cr,left,133,16);
  if(doc.seller_vat)label('VAT: '+doc.seller_vat,left,163,16);
  if(logo){const scale=Math.min(205/logo.width,150/logo.height);ctx.drawImage(logo,(W-logo.width*scale)/2,52,logo.width*scale,logo.height*scale)}
  if(doc.seller_name_ar||doc.company_name_ar)rightText(short(doc.seller_name_ar||doc.company_name_ar,45),right,100,21,true);
  if(doc.seller_cr)rightText('س.ت.: '+doc.seller_cr,right,133,16);
  if(doc.seller_vat)rightText('الرقم الضريبي: '+doc.seller_vat,right,163,16);
  label(heading,W/2,260,39,true,INK,'center');
  if(draft){ctx.save();ctx.strokeStyle='#c52222';ctx.lineWidth=4;ctx.strokeRect(right-170,274,164,44);label('PREVIEW',right-157,303,25,true,'#c52222');ctx.restore()}
  // Two-column reference-style metadata, not three shaded boxes.
  const metaY=draft?343:313;
  label('Customer / العميل',left,metaY,18,true);
  label(short(doc.buyer_name||doc.receiver_name||doc.name||'—',57),left,metaY+30,19);
  if(doc.buyer_phone||doc.receiver_phone)label('Mobile: '+(doc.buyer_phone||doc.receiver_phone),left,metaY+56,16);
  if(doc.buyer_id||doc.client_id)label('ID / رقم التعريفي: '+(doc.buyer_id||doc.client_id),left,metaY+80,16);
  if(doc.buyer_vat)label('Customer VAT / الرقم الضريبي للعميل: '+doc.buyer_vat,left,metaY+105,15);
  const mx=720;
  label('Invoice No. / رقم الفاتورة',mx,metaY,17,true);
  rightText(doc.reference||'Pending',right,metaY,18);
  label('Date / التاريخ',mx,metaY+33,17,true);
  rightText(pdfDate(doc.date)+(doc.invoice_time?' '+doc.invoice_time:''),right,metaY+33,17);
  if(doc.po_number||doc.reference_number){label('PO Number / رقم أمر الشراء',mx,metaY+66,16,true);rightText(short(doc.po_number||doc.reference_number,23),right,metaY+66,17)}
  y=metaY+145;
  // Item grid uses reference's blue bilingual header and full-width column rules.
  const col=[left,left+42,left+628,left+725,left+860,left+990,right];
  const gridRow=(yy,height,fill='#fff')=>{rect(left,yy,contentW,height,fill,'#c9c9c9');ctx.strokeStyle='#d3d3d3';ctx.lineWidth=1;for(const x of col.slice(1,-1)){ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x,yy+height);ctx.stroke()}};
  function tableHeader(){const yy=y;rect(left,yy,contentW,90,BLUE,null);
    label('#',left+9,yy+31,17,true,'#fff');label('Item / وصف الصنف',left+58,yy+31,17,true,'#fff');
    rightText('Qty /',col[3]-8,yy+28,16,true,'#fff');rightText('الكمية',col[3]-8,yy+53,15,true,'#fff');
    rightText('Unit Price /',col[4]-8,yy+28,15,true,'#fff');rightText('سعر الوحدة',col[4]-8,yy+53,14,true,'#fff');
    rightText('Taxable Value /',col[5]-8,yy+28,15,true,'#fff');rightText('الخاضع للضريبة',col[5]-8,yy+53,13,true,'#fff');
    rightText('Total Incl. VAT /',right-8,yy+28,15,true,'#fff');rightText('الإجمالي شامل الضريبة',right-8,yy+53,13,true,'#fff');y+=90;
  }
  tableHeader();
  const fmt=n=>Number(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
  items.forEach((item,i)=>{
    const qty=Number(item.quantity||0),price=Number(item.unit_price||0),taxable=round(qty*price),incl=round(taxable*1.15);
    const desc=clean(item.description||'Item');ctx.font=font(18);let words=desc.split(/\s+/),segments=[],current='';for(const word of words){const v=current?current+' '+word:word;if(ctx.measureText(v).width>550&&current){segments.push(current);current=word}else current=v}if(current)segments.push(current);
    const h=Math.max(66,segments.length*27+24);
    if(y+h+380>1600){nextPage();y=145;tableHeader()}
    gridRow(y,h);label(String(i+1),left+12,y+32,17);segments.forEach((v,k)=>label(v,left+58,y+32+k*27,18));
    rightText(fmt(qty),col[3]-10,y+32,17);rightText(fmt(price),col[4]-10,y+32,16);rightText(fmt(taxable),col[5]-10,y+32,16);rightText(fmt(incl),right-10,y+32,17,true);y+=h;
  });
  // Reference leaves several blank ruled item lines when space permits.
  const blankCount=Math.min(3,Math.max(0,Math.floor((920-y)/55)));
  for(let i=0;i<blankCount;i++){gridRow(y,55);y+=55}
  // Keep the Total label in its own cell, away from the numeric columns.
  rect(left,y,contentW,40,'#d9dce2',null);rightText('Total',col[4]-12,y+28,18,true);rightText(fmt(subtotal),col[5]-10,y+28,17,true);rightText(fmt(total),right-10,y+28,17,true);y+=70;
  if(y+520>1600){nextPage();y=155}
  const totalsX=535,totalsValX=right-4;
  // Reserve an independent right-aligned amount column so long bilingual
  // captions cannot run into SAR values. Shrink captions only when needed.
  const amountColumnLeft=960;
  const fittedLabel=(value,x,baseline,maxWidth,preferred=17,bold=false,color=COLORS.ink)=>{
    let size=preferred;
    while(size>12){ctx.font=font(size,bold);if(ctx.measureText(value).width<=maxWidth)break;size-=0.5;}
    label(value,x,baseline,size,bold,color);
  };
  const summary=(caption,val,yy,bold=false)=>{
    fittedLabel(caption,totalsX,yy,amountColumnLeft-totalsX-18,17,bold);
    rightText('﷼ '+fmt(val),totalsValX,yy,18,bold);
  };
  summary('Taxable Amount / المبلغ الخاضع للضريبة:',subtotal,y);
  summary('Total VAT (15%) / إجمالي الضريبة:',vat,y+38);
  summary('Total Including VAT / الإجمالي شامل الضريبة:',total,y+76);
  // Signature area intentionally blank: never fabricate a real signature or stamp.
  label('Authorized Signatory',left+30,y+64,18,true);
  rect(totalsX-5,y+103,right-totalsX+5,57,BLUE,null);
  fittedLabel('Invoice Total / إجمالي الفاتورة:',totalsX+8,y+140,amountColumnLeft-totalsX-22,21,true,'#fff');
  rightText('﷼ '+fmt(total),right-10,y+140,23,true,'#fff');
  rightText('('+moneyWords(total)+')',right,y+187,16,false,'#555');
  y+=228;
  // Preserve mandatory QR even though reference uses a 1D barcode.
  if(invoice){label('QR Code / رمز الاستجابة السريعة',left,y+20,18,true);if(qr){ctx.fillStyle='#fff';ctx.fillRect(left,y+30,220,220);ctx.drawImage(qr,left,y+30,220,220)}else{rect(left,y+32,220,200,'#fff8f5','#e4bcad');wrapText('QR unavailable',left+12,y+65,185,17,true,COLORS.warn)}y+=270}
  const bankLines=[['Bank Name',doc.bank_name],['A/c Name',doc.bank_account_name],['Account No.',doc.bank_account_number],['IBAN No.',doc.iban||doc.bank_iban],['SWIFT No.',doc.swift||doc.bank_swift]].filter(([k,v])=>clean(v));
  if(bankLines.length){if(y+bankLines.length*24+100>1620){nextPage();y=150}label('Bank Details',left,y+24,18,true);y+=54;for(const [k,v] of bankLines){label(k+': '+v,left,y,16);y+=24}y+=18}
  const notes=uniqueNotes(doc.notes);
  if(notes){if(y+95>1620){nextPage();y=155}label('Notes / ملاحظات',left,y+22,17,true);y=wrapText(notes,left,y+51,contentW,16,false,COLORS.ink,23,6)+20}
  // Compact Code128-style barcode is intentionally omitted rather than inventing
  // an invalid barcode. Existing QR remains scannable.
  capture();
  const base=clean(doc.reference||'DRAFT-'+(doc.date||'document')).replace(/[^a-z0-9_-]/gi,'_').slice(0,70);
  return new File([makePdf(jpegPages)],(draft?'PREVIEW_':'')+base+'.pdf',{type:'application/pdf'});
}
export async function downloadDocumentPdf(doc,kind='Invoices',qrMarkup='',mode='preview'){
  const file=await createDocumentPdfFile(doc,kind,qrMarkup,mode);
  const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return file.name;
}
export async function previewDocumentPdf(doc,kind='Invoices',qrMarkup=''){
  const popup=window.open('','_blank');if(!popup)throw Error('Allow pop-ups to preview the PDF.');
  try{popup.document.write('<title>Preparing invoice preview</title><body style="font:16px Arial;padding:30px">Preparing document preview...</body>');
    const file=await createDocumentPdfFile(doc,kind,qrMarkup,'preview'),url=URL.createObjectURL(file);
    popup.location.replace(url);setTimeout(()=>URL.revokeObjectURL(url),5*60*1000);
  }catch(error){popup.close();window.alert('PDF preview failed: '+error.message);throw error}
}
