/** ALIF SYNC V5.3 — A4 bilingual invoice render, shared by Preview and Download.
 * Uses a high-resolution lossless canvas PDF. A preview is NEVER an issued tax invoice.
 * Do not use a browser-generated demo QR as evidence of ZATCA Phase 2 acceptance.
 */
const pdfDate = value => { const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(value||''));return m?`${m[3]}/${m[2]}/${m[1]}`:(value||'—'); };
const RIYAL='\u20c1'; // Official Saudi Riyal sign (Unicode U+20C1), never U+FDFC.
// Official SAMA symbol geometry. Draw as vector paths on the high-DPI PDF canvas,
// rather than depending on a browser font having recently added Unicode U+20C1.
const RIYAL_PATHS=[
  'M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z',
  'M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z'
];
const SAR = n=>RIYAL+' '+Number(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
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

function makePdf(images){
  const encoder=new TextEncoder(),parts=[];let len=0;const offsets=[];
  const push=b=>{const data=typeof b==='string'?encoder.encode(b):b;parts.push(data);len+=data.length};
  const obj=(id,data)=>{offsets[id]=len;push(`${id} 0 obj\n`);push(data);push('\nendobj\n')};
  push('%PDF-1.4\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,`<< /Type /Pages /Kids [ ${images.map((_,i)=>3+3*i+' 0 R').join(' ')} ] /Count ${images.length} >>`);
  images.forEach((picture,i)=>{
    const p=3+i*3,img=p+1,stream=p+2;
    obj(p,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /I${i} ${img} 0 R >> >> /Contents ${stream} 0 R >>`);
    offsets[img]=len;push(`${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${picture.width} /Height ${picture.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${picture.data.length} >>\nstream\n`);push(picture.data);push('\nendstream\nendobj\n');
    const content=`q 595.28 0 0 841.89 0 0 cm /I${i} Do Q`;
    obj(stream,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  const xref=len;push(`xref\n0 ${3+images.length*3}\n0000000000 65535 f \n`);
  for(let i=1;i<=images.length*3+2;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
  push(`trailer\n<< /Size ${3+images.length*3} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts,{type:'application/pdf'});
}
const COLORS={ink:'#171717',gray:'#555555',muted:'#777777',rule:'#d9d9d9',light:'#f5f5f5',brand:'#3763a3',warn:'#8a3b28'};
const W=1240,H=1754,margin=64,right=W-margin;
const RENDER_SCALE=3; // 3720 x 5262 (~450 DPI), lossless A4 rendering
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
  if(/^data:image\/(?:png|jpeg|webp|svg\+xml);(?:base64,|charset=utf-8,)/.test(doc.company_logo||'')){try{logo=await loadImage(doc.company_logo)}catch{/* logo optional */}}
  if(invoice && qrMarkup){try{qr=await loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrMarkup))}catch(e){throw Error('Invoice QR could not render in the PDF: '+e.message)}}
  const imagePages=[];let ctx,y,page=0;
  const font=(size=20,bold=false,arabic=false)=>`${bold?'700 ':'400 '}${(size*1.10).toFixed(2)}px ${arabic?'"Noto Naskh Arabic",Tahoma,Arial':'"Noto Sans Arabic","Segoe UI Symbol",Arial,sans-serif'}`;
  const label=(text,x,yy,size=17,bold=false,color=COLORS.ink,align='left',ar=false)=>{
    ctx.save();ctx.fillStyle=color;ctx.font=font(size,bold,ar);ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.direction=ar?'rtl':'ltr';ctx.fillText(clean(text),x,yy);ctx.restore();
  };
  // Currency is drawn with the official symbol paths, so no OS/font fallback box.
  const drawRiyal=(x,baseline,size,color=COLORS.ink)=>{
    const symbolHeight=size*0.94, symbolWidth=symbolHeight*(1124.14/1256.39);
    ctx.save();ctx.translate(x,baseline-symbolHeight*0.86);ctx.scale(symbolWidth/1124.14,symbolHeight/1256.39);
    ctx.fillStyle=color;for(const d of RIYAL_PATHS)ctx.fill(new Path2D(d));ctx.restore();
    return symbolWidth;
  };
  const amountText=(n,x,baseline,size=17,bold=false,color=COLORS.ink)=>{
    const value=Number(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
    ctx.save();ctx.font=font(size,bold);const width=ctx.measureText(value).width;ctx.restore();
    const glyphW=size*0.94*(1124.14/1256.39),gap=7;
    const textStart=x-width;label(value,textStart,baseline,size,bold,color,'left');
    drawRiyal(textStart-gap-glyphW,baseline,size,color);
  };
  const arabicRight=(value,x,baseline,size=17,bold=false,color=COLORS.ink)=>
    label(value,x,baseline,size,bold,color,'right',true);
  // Footer lines are centered and wrapped independently so longer registered
  // addresses stay within the A4 margins.
  const footerWrap=(value,baseline,size)=>{
    const content=clean(value);if(!content)return;
    ctx.save();ctx.font=font(size,false);const chunks=[];let current='';
    for(const word of content.split(/\s+/)){
      const next=current?current+' '+word:word;
      if(ctx.measureText(next).width>W-margin*2 && current){chunks.push(current);current=word}else current=next;
    }
    if(current)chunks.push(current);ctx.restore();
    chunks.slice(0,2).forEach((part,i)=>label(part,W/2,baseline+i*(size+3),size,false,COLORS.gray,'center'));
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
    const canvas=document.createElement('canvas');canvas.width=W*RENDER_SCALE;canvas.height=H*RENDER_SCALE;ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});ctx.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
    page++;
    // Footer is a separate fixed zone: divider, address and contact never overlap.
    ctx.fillStyle='#c92828';ctx.fillRect(margin,H-204,W-margin*2,3);
    // Company identity in both languages, then address and optional contact details.
    const footerName=clean(doc.seller_name||doc.sender_name||doc.company_name);
    const footerArabicName=clean(doc.seller_name_ar||doc.company_name_ar);
    const footerEmail=clean(doc.seller_email||doc.company_email);
    const footerWebsite=clean(doc.seller_website||doc.company_website);
    const contactLine=[footerEmail&&'Email: '+footerEmail,footerWebsite&&'Website: '+footerWebsite].filter(Boolean).join('  |  ');
    let footerY=H-178;
    if(footerName){footerWrap(footerName,footerY,20);footerY+=26;}
    if(footerArabicName){label(footerArabicName,W/2,footerY,20,true,COLORS.ink,'center',true);footerY+=26;}
    const footerAddress=clean(doc.seller_address||doc.sender_address||doc.company_address);
    if(footerAddress){footerWrap(footerAddress,footerY,19);footerY+=50;}
    if(contactLine)footerWrap(contactLine,Math.min(footerY,H-40),17);
    label(`Page ${page}`,right,H-27,13,false,COLORS.gray,'right');
    y=140;
    return canvas;
  }
  let canvas=basePage();
  function capture(){imagePages.push(canvas)}
  async function compressPage(pageCanvas){
    if(typeof CompressionStream==='undefined')throw Error('This browser does not support lossless PDF compression. Please use an updated Chrome or Edge.');
    const {width,height}=pageCanvas;
    const pixels=pageCanvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data;
    const rgb=new Uint8Array(width*height*3);
    for(let src=0,dst=0;src<pixels.length;src+=4){rgb[dst++]=pixels[src];rgb[dst++]=pixels[src+1];rgb[dst++]=pixels[src+2]}
    const compressed=await new Response(new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
    return {width,height,data:new Uint8Array(compressed)};
  }
  function nextPage(){capture();canvas=basePage();return canvas}
  // Faithful A4 reference layout: bilingual identity, centered logo, blue grid and total.
  // Seller identity appears ONLY in the header, never in a second seller panel.
  const BLUE='#3763a3', INK='#171717', LIGHT='#d9dde4';
  const left=margin, contentW=right-margin;
  const rightText=(t,x,yy,size=17,bold=false,color=INK)=>label(t,x,yy,size,bold,color,'right');
  const short=(s,n=70)=>clean(s).slice(0,n);
  const heading=title;
  // Company identity — same positions as the reference page.
  label(short(doc.seller_name||doc.sender_name||'Company',42),left,100,22,true);
  if(doc.seller_cr)label('C.R.: '+doc.seller_cr,left,133,16);
  if(doc.seller_vat)label('VAT: '+doc.seller_vat,left,163,16);
  const sellerAddress=clean(doc.seller_address||doc.sender_address||doc.company_address);
  // Company address appears in footer only; never duplicate it in the top-left header.
  if(logo){const scale=Math.min(270/logo.width,180/logo.height);ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(logo,(W-logo.width*scale)/2,52,logo.width*scale,logo.height*scale);ctx.restore()}
  if(doc.seller_name_ar||doc.company_name_ar)arabicRight(short(doc.seller_name_ar||doc.company_name_ar,70),right,100,21,true);
  const arabicIndicDigits = value => String(value ?? '').replace(/[0-9]/g, digit => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
  if(doc.seller_cr)arabicRight('السجل التجاري: '+arabicIndicDigits(doc.seller_cr),right,133,16);
  if(doc.seller_vat)arabicRight('الرقم الضريبي: '+arabicIndicDigits(doc.seller_vat),right,163,16);
  label(heading,W/2,250,invoice||proforma?41*1.20:41,true,INK,'center');
  if(arabic)label(arabic,W/2,292,invoice||proforma?27*1.20:27,true,INK,'center',true);
  if(draft){ctx.save();ctx.strokeStyle='#c52222';ctx.lineWidth=4;ctx.strokeRect(right-170,274,164,44);label('PREVIEW',right-157,303,25,true,'#c52222');ctx.restore()}
  // Two-column reference-style metadata, not three shaded boxes.
  const metaY=draft?373:343;
  label('Customer / العميل',left,metaY,18,true);
  label(short(doc.buyer_name||doc.receiver_name||doc.name||'—',57),left,metaY+30,19);
  // Optional customer fields occupy space only when populated.
  let customerY=metaY+56;
  if(doc.buyer_phone||doc.receiver_phone){
    label('Mobile: '+(doc.buyer_phone||doc.receiver_phone),left,customerY,16);
    customerY+=26;
  }
  if(doc.buyer_id){
    label('ID: '+doc.buyer_id,left,customerY,16);
    customerY+=26;
  }
  if(doc.buyer_vat){
    label('Customer VAT / الرقم الضريبي للعميل: '+doc.buyer_vat,left,customerY,15);
    customerY+=26;
  }
  const buyerAddress=clean(doc.buyer_address||doc.receiver_address||doc.client_address);
  if(buyerAddress){
    label('Customer Address / عنوان العميل:',left,customerY,15,true);
    customerY+=23;
    customerY=wrapText(buyerAddress,left,customerY,600,15,false,COLORS.gray,20,2);
  }
  const mx=720;
  label('Invoice No. / رقم الفاتورة',mx,metaY,17,true);
  rightText(doc.reference||'Pending',right,metaY,18);
  label('Date / التاريخ',mx,metaY+33,17,true);
  rightText(pdfDate(doc.date)+(doc.invoice_time?' '+doc.invoice_time:''),right,metaY+33,17);
  if(doc.po_number||doc.reference_number){label('PO Number / رقم أمر الشراء',mx,metaY+66,16,true);rightText(short(doc.po_number||doc.reference_number,23),right,metaY+66,17)}
  y=Math.max(metaY+116,customerY+22);
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
  // Monetary columns use amountText() so the true 2025 symbol cannot be missing.
  items.forEach((item,i)=>{
    const qty=Number(item.quantity||0),price=Number(item.unit_price||0),taxable=round(qty*price),incl=round(taxable*1.15);
    const desc=clean(item.description||'Item');ctx.font=font(18);let words=desc.split(/\s+/),segments=[],current='';for(const word of words){const v=current?current+' '+word:word;if(ctx.measureText(v).width>550&&current){segments.push(current);current=word}else current=v}if(current)segments.push(current);
    const h=Math.max(66,segments.length*27+24);
    if(y+h+435>H-165){nextPage();y=145;tableHeader()}
    gridRow(y,h);label(String(i+1),left+12,y+32,17);segments.forEach((v,k)=>label(v,left+58,y+32+k*27,18));
    rightText(fmt(qty),col[3]-10,y+32,17);amountText(price,col[4]-10,y+32,16);amountText(taxable,col[5]-10,y+32,16);amountText(incl,right-10,y+32,17,true);y+=h;
  });
  // No decorative empty item rows: preserve space for totals, notes and footer.
  // Keep the Total label in its own cell, away from the numeric columns.
  rect(left,y,contentW,40,'#d9dce2',null);rightText('Total',col[4]-12,y+28,18,true);amountText(subtotal,col[5]-10,y+28,17,true);amountText(total,right-10,y+28,17,true);y+=70;
  if(y+385>H-165){nextPage();y=155}
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
    amountText(val,totalsValX,yy,18,bold);
  };
  summary('Taxable Amount / المبلغ الخاضع للضريبة:',subtotal,y);
  summary('Total VAT (15%) / إجمالي الضريبة:',vat,y+38);
  summary('Total Including VAT / الإجمالي شامل الضريبة:',total,y+76);
  // Signature area intentionally blank: never fabricate a real signature or stamp.
  label('Authorized Signatory',left+30,y+64,18,true);
  rect(totalsX-5,y+103,right-totalsX+5,57,BLUE,null);
  fittedLabel(proforma?'Proforma Total / الإجمالي المبدئي:':'Invoice Total / إجمالي الفاتورة:',totalsX+8,y+140,amountColumnLeft-totalsX-22,21,true,'#fff');
  amountText(total,right-10,y+140,23,true,'#fff');
  rightText('('+moneyWords(total)+')',right,y+187,16,false,'#555');
  y+=206;
  // Compact lower zone: signatory stays above notes, QR on the right.
  const lowerTop=y;
  // Keep QR location and 190 x 190 size unchanged. Notes start below its bottom edge.
  if(invoice){const qx=right-210;label('QR Code / رمز الاستجابة السريعة',qx,lowerTop+16,16,true);if(qr){ctx.fillStyle='#fff';ctx.fillRect(qx,lowerTop+25,190,190);ctx.drawImage(qr,qx,lowerTop+25,190,190)}else{rect(qx,lowerTop+25,190,170,'#fff8f5','#e4bcad');wrapText('QR unavailable',qx+12,lowerTop+58,165,16,true,COLORS.warn)}}
  // Optional bank details are per-document only, never prefilled or hardcoded.
  // They appear below the QR and immediately above remarks, in both preview and final.
  const bankLines=[
    ['Bank Name',doc.bank_name],['A/c Name',doc.bank_account_name],
    ['Account No.',doc.bank_account_number],['IBAN No.',doc.bank_iban],
    ['SWIFT No.',doc.bank_swift]
  ].filter(([,value])=>clean(value));
  const notesTop=invoice?lowerTop+235:lowerTop+16; // QR ends at lowerTop+215
  const notes=uniqueNotes(doc.notes||doc.remarks||doc.remark);
  let cursor=notesTop;
  const bottomLimit=H-216;
  const ensureRoom=(height)=>{if(cursor+height>bottomLimit){nextPage();cursor=158;}};
  if(bankLines.length){
    ensureRoom(39+bankLines.length*29);
    label('Bank Details / التفاصيل البنكية',left,cursor,17,true);
    cursor+=34;
    for(const [key,value] of bankLines){
      ensureRoom(30);
      label(key+': '+short(value,100),left,cursor,16);
      cursor+=29;
    }
    cursor+=14;
  }
  if(notes){
    ensureRoom(68);
    label('Remarks / Notes / ملاحظات',left,cursor,17,true);
    cursor+=28;
    // Wrap notes in the available width; paginate if content exceeds the footer zone.
    const noteWords=clean(notes).split(/\s+/);
    let lineText='';
    const flush=()=>{if(!lineText)return;ensureRoom(25);label(lineText,left,cursor,16);cursor+=25;lineText='';};
    for(const word of noteWords){
      const candidate=lineText?lineText+' '+word:word;
      ctx.font=font(16);
      if(ctx.measureText(candidate).width>contentW && lineText)flush();
      lineText=lineText?lineText+' '+word:word;
    }
    flush();
  }
  y=cursor+12;
  // Compact Code128-style barcode is intentionally omitted rather than inventing
  // an invalid barcode. Existing QR remains scannable.
  capture();
  const base=clean(doc.reference||'DRAFT-'+(doc.date||'document')).replace(/[^a-z0-9_-]/gi,'_').slice(0,70);
  return new File([makePdf(await Promise.all(imagePages.map(compressPage)))],(draft?'PREVIEW_':'')+base+'.pdf',{type:'application/pdf'});
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
