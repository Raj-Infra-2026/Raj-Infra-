/** ALIF LABS V5.3 — A4 bilingual invoice render, shared by Preview and Download.
 * Uses a browser-rendered canvas PDF. A preview is NEVER an issued tax invoice.
 * Do not use a browser-generated demo QR as evidence of ZATCA Phase 2 acceptance.
 */
const pdfDate = value => { const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(value||''));return m?`${m[3]}/${m[2]}/${m[1]}`:(value||'—'); };
const SAR = n=>'SAR '+Number(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const round = n=>Math.round((Number(n)||0)*100)/100;
const clean = v=>String(v??'').trim();
const moneyWords = value => {
  const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function say(n){n=Math.floor(n);if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+say(n%10):'');if(n<1000)return say(Math.floor(n/100))+' hundred'+(n%100?' '+say(n%100):'');if(n<1e6)return say(Math.floor(n/1000))+' thousand'+(n%1000?' '+say(n%1000):'');if(n<1e9)return say(Math.floor(n/1e6))+' million'+(n%1e6?' '+say(n%1e6):'');return String(n);}
  const r=Math.floor(Number(value)||0),h=Math.round(((Number(value)||0)-r)*100);return say(r)+' Saudi riyals'+(h?' and '+say(h)+' halalas':'')+' only';
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
const COLORS={ink:'#202531',gray:'#606875',muted:'#7c8491',rule:'#d8dce5',light:'#f4f5f8',brand:'#202531',warn:'#8a3b28'};
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
    page++;ctx.fillStyle=COLORS.brand;ctx.fillRect(margin,57,5,50);
    ctx.fillStyle=COLORS.light;ctx.fillRect(margin,H-96,W-margin*2,37);
    label(`${title}  ·  ${doc.reference||'Number assigned on submission'}`,margin+12,H-72,16,true,COLORS.gray);
    label(`Page ${page}`,right-12,H-72,16,false,COLORS.gray,'right');
    y=140;
    return canvas;
  }
  let canvas=basePage();
  function capture(){const jpg=canvas.toDataURL('image/jpeg',0.97).split(',')[1],bin=atob(jpg),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);jpegPages.push(bytes)}
  function nextPage(){capture();canvas=basePage();return canvas}
  // Header: company identity on the left; bilingual invoice title at right.
  let sx=margin;if(logo){const scale=Math.min(160/logo.width,115/logo.height);ctx.drawImage(logo,margin,140,logo.width*scale,logo.height*scale);sx=margin+185;}
  label(doc.seller_name||doc.sender_name||'Company name',sx,160,27,true);
  wrapText(doc.seller_address||doc.sender_address||'',sx,189,550-(sx-margin),16,false,COLORS.gray,22,2);
  if(doc.seller_cr)label('CR  '+doc.seller_cr,sx,238,17,false,COLORS.gray);
  if(doc.seller_vat)label('VAT  '+doc.seller_vat,sx,264,17,false,COLORS.gray);
  if(doc.seller_email)label(doc.seller_email,sx,290,16,false,COLORS.gray);
  label(title,right,177,38,true,COLORS.ink,'right');
  if(arabic)label(arabic,right,221,25,true,COLORS.ink,'right',true);
  label(clean(doc.reference)||'Number assigned on submission',right,258,17,true,COLORS.gray,'right');
  if(draft){ctx.save();ctx.strokeStyle='#c52222';ctx.lineWidth=5;ctx.strokeRect(right-225,280,190,57);label('PREVIEW',right-208,319,31,true,'#c52222');ctx.restore();}
  const detailsY=draft?390:328;const metaW=(W-2*margin-18)/3;
  const details=[['INVOICE DATE  /  تاريخ الفاتورة',pdfDate(doc.date)],['PO NUMBER  /  رقم أمر الشراء',doc.po_number||doc.reference_number||'—'],['DOCUMENT NUMBER  /  رقم الفاتورة',doc.reference||'Pending draft']];
  details.forEach(([heading,value],i)=>{const x=margin+i*(metaW+9);rect(x,detailsY,metaW,105);label(heading,x+12,detailsY+28,15,true,COLORS.gray);wrapText(value,x+12,detailsY+66,metaW-28,20,true,COLORS.ink,24,2)});
  const boxY=detailsY+128,boxW=(W-2*margin-14)/2,boxH=163;
  function entityBox(x,heading,name,address,vat,phone){rect(x,boxY,boxW,boxH,'#fff');rect(x+8,boxY+8,boxW-16,34,COLORS.light,null);label(heading,x+18,boxY+32,17,true);label(name||'—',x+18,boxY+66,21,true);wrapText(address||'—',x+18,boxY+92,boxW-36,16,false,COLORS.gray,21,2);if(vat)label('VAT: '+vat,x+18,boxY+148,15,false,COLORS.gray);else if(phone)label('Phone: '+phone,x+18,boxY+148,15,false,COLORS.gray)}
  entityBox(margin,'SELLER  /  البائع',doc.seller_name||doc.sender_name,doc.seller_address||doc.sender_address,doc.seller_vat,doc.seller_phone);
  entityBox(margin+boxW+14,'BUYER  /  المشتري',doc.buyer_name||doc.receiver_name||doc.name,doc.buyer_address||doc.receiver_address,doc.buyer_vat);
  y=boxY+186;
  if(invoice && doc.invoice_time)label('Document time (Saudi Arabia): '+doc.invoice_time,margin,y,17,false,COLORS.gray);
  y+=34;
  function tableHeader(){
    rect(margin,y,W-2*margin,46,COLORS.light);label('#',margin+14,y+29,18,true);label('DESCRIPTION  /  الوصف',margin+60,y+29,18,true);
    label('QTY',835,y+29,18,true,COLORS.ink,'right');label('RATE (SAR)',975,y+29,18,true,COLORS.ink,'right');label('TOTAL (SAR)',right-13,y+29,18,true,COLORS.ink,'right');y+=46;
  }
  tableHeader();
  items.forEach((item,i)=>{
    const words=clean(item.description||'Item').split(/\s+/);let candidate='',lines=[];
    ctx.font=font(19);for(const word of words){const txt=candidate?candidate+' '+word:word;if(ctx.measureText(txt).width>560&&candidate){lines.push(candidate);candidate=word}else candidate=txt}if(candidate)lines.push(candidate);
    const rowHeight=Math.max(58,Math.min(lines.length,8)*26+22);
    if(y+rowHeight>1450){nextPage();y=170;label(title+' — continued',margin,y,26,true);y+=38;tableHeader()}
    rect(margin,y,W-2*margin,rowHeight,i%2?'#fafbfc':'#fff');
    label(String(i+1),margin+16,y+34,19);lines.slice(0,8).forEach((t,k)=>label(t,margin+60,y+34+26*k,19));
    label(String(item.quantity||0),835,y+34,18,false,COLORS.ink,'right');
    label(Number(item.unit_price||0).toFixed(2),975,y+34,18,false,COLORS.ink,'right');
    label(round(Number(item.quantity||0)*Number(item.unit_price||0)).toFixed(2),right-13,y+34,18,true,COLORS.ink,'right');y+=rowHeight;
  });
  if(y+420>1620){nextPage();y=170;label(title+' — totals',margin,y,26,true);y+=44}
  y+=28;const sumY=y;
  // Machine-readable demo QR; NEVER label as signed or cleared.
  if(invoice){
    label('DOCUMENT QR  /  رمز الاستجابة السريعة',margin,y,18,true);
    if(qr){ctx.fillStyle='#fff';ctx.fillRect(margin+3,y+14,245,245);ctx.drawImage(qr,margin+3,y+14,245,245);}
    else {rect(margin+2,y+16,245,225,'#fff8f5','#e4bcad');wrapText('QR unavailable. Enter a genuine registered seller VAT number (15 digits, starting and ending with 3).',margin+16,y+58,220,17,true,COLORS.warn,23,7)}
  }
  const sx2=755,sw=right-sx2;let sy=sumY;
  function amountLine(t,val,em=false){if(em)rect(sx2-12,sy-27,sw+12,39,'#e8eaef',null);label(t,sx2,sy,18,em);label(SAR(val),right-6,sy,18,true,COLORS.ink,'right');sy+=38;line(sx2-10,sy-10,right)}
  amountLine('Subtotal / الإجمالي الفرعي',doc.subtotal??subtotal);
  amountLine('VAT 15% / ضريبة القيمة المضافة',vat);
  for(const a of adjustments.slice(0,5))amountLine(a.type||'Adjustment',a.signed);
  amountLine('GRAND TOTAL / الإجمالي',total,true);
  y=Math.max(sy+35,invoice?sumY+355:sumY+50);
  if(y+110>1620){nextPage();y=170;}
  line(margin,y,right);y+=38;label('AMOUNT IN WORDS  /  المبلغ كتابة',margin,y,17,true,COLORS.gray);y+=33;
  y=wrapText(moneyWords(total),margin,y,right-margin,18,false,COLORS.ink,25,2)+16;
  if(doc.notes){if(y+110>1620){nextPage();y=170;}line(margin,y,right);y+=34;label('NOTES  /  ملاحظات',margin,y,17,true);y+=32;y=wrapText(doc.notes,margin,y,right-margin,18,false,COLORS.ink,26,6)}
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
