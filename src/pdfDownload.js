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
  const itemAmounts=items.map(x=>{const base=round(Number(x.quantity||0)*Number(x.unit_price||0));const discount=round(x.discount_type==='fixed'?Number(x.discount_value||0):base*Number(x.discount_value||0)/100);const taxable=round(base-discount);return {taxable,vat:round(taxable*Number(x.vat_rate??15)/100),total:round(taxable+round(taxable*Number(x.vat_rate??15)/100))}});
  const subtotal=round(doc.subtotal??itemAmounts.reduce((n,x)=>n+x.taxable,0));
  const vat=round(doc.vat_amount??itemAmounts.reduce((n,x)=>n+x.vat,0)), adjustments=(doc.adjustments||[]).map(a=>({...a, signed:['Deduction','Retention'].includes(a.type)?-Math.abs(Number(a.amount||0)):Number(a.amount||0)}));
  const total=round(doc.amount??subtotal+vat+adjustments.reduce((n,a)=>n+a.signed,0));
  let logo=null,qr=null;
  if(/^data:image\/(?:png|jpeg|webp|svg\+xml);(?:base64,|charset=utf-8,)/.test(doc.company_logo||'')){try{logo=await loadImage(doc.company_logo)}catch{/* logo optional */}}
  if(invoice && qrMarkup){try{qr=await loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrMarkup))}catch(e){throw Error('Invoice QR could not render in the PDF: '+e.message)}}
  const imagePages=[];let ctx,y,page=0;
  const font=(size=20,bold=false,arabic=false)=>`${bold?'700 ':'400 '}${(size*1.32).toFixed(2)}px ${arabic?'"Noto Naskh Arabic",Tahoma,Arial':'"Noto Sans Arabic","Segoe UI Symbol",Arial,sans-serif'}`;
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
  // Draw the official Riyal glyph and an amount as ONE measured unit. The amount
  // can never extend into a neighbouring table cell, even for multi-million values.
  const fittedAmount=(value,rightEdge,baseline,availableWidth,preferredSize=17,bold=false,color=COLORS.ink)=>{
    const formatted=Number(value||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
    const widthAt=(size)=>{
      ctx.save();ctx.font=font(size,bold);
      const width=ctx.measureText(formatted).width+size*0.94*(1124.14/1256.39)+7;
      ctx.restore();return width;
    };
    let size=preferredSize;
    while(size>10 && widthAt(size)>availableWidth)size-=0.5;
    const naturalWidth=widthAt(size);
    ctx.save();
    if(naturalWidth>availableWidth){
      // Worst-case large totals: compress horizontally, never print across a border.
      ctx.translate(rightEdge,0);ctx.scale(availableWidth/naturalWidth,1);
      amountText(value,0,baseline,size,bold,color);
    }else amountText(value,rightEdge,baseline,size,bold,color);
    ctx.restore();
  };
  const arabicRight=(value,x,baseline,size=17,bold=false,color=COLORS.ink)=>
    label(value,x,baseline,size,bold,color,'right',true);
  // Footer lines are centered and wrapped independently so longer registered
  // addresses stay within the A4 margins.
  // Center footer lines with measured widths; long URLs and Arabic names cannot spill off-page.
  const footerWrap=(value,baseline,size,arabicText=false,bold=false)=>{
    const content=clean(value);if(!content)return 0;
    const maxWidth=W-margin*2-40;
    let currentSize=size;
    ctx.save();
    while(currentSize>10){ctx.font=font(currentSize,bold,arabicText);if(ctx.measureText(content).width<=maxWidth)break;currentSize-=0.5;}
    const chunks=[];
    if(ctx.measureText(content).width<=maxWidth)chunks.push(content);
    else {
      let line='';
      for(const word of content.split(/\s+/)){
        const candidate=line?line+' '+word:word;
        if(line&&ctx.measureText(candidate).width>maxWidth){chunks.push(line);line=word;}else line=candidate;
        // Break unspaced long strings (e.g. URLs) rather than clipping them.
        while(ctx.measureText(line).width>maxWidth){let n=line.length-1;while(n>1&&ctx.measureText(line.slice(0,n)).width>maxWidth)n--;chunks.push(line.slice(0,n));line=line.slice(n);}
      }
      if(line)chunks.push(line);
    }
    ctx.restore();
    chunks.forEach((part,i)=>label(part,W/2,baseline+i*(currentSize*1.32+6),currentSize,bold,COLORS.gray,'center',arabicText));
    return chunks.length*(currentSize*1.32+6);
  };
  function wrapText(str,x,yy,maxWidth,size=20,bold=false,color=COLORS.ink,lineH=size+8,maxLines=100){
    // Measure with the real rendered font and split even words without spaces.
    const measure=(value)=>{ctx.save();ctx.font=font(size,bold);const w=ctx.measureText(value).width;ctx.restore();return w;};
    let count=0,buffer='';
    const write=()=>{if(!buffer)return false;label(buffer,x,yy,size,bold,color);yy+=lineH;count++;buffer='';return count>=maxLines;};
    for(const sourceLine of clean(str).replace(/\r/g,'').split('\n')){
      for(const word of sourceLine.split(/\s+/).filter(Boolean)){
        let part=word;
        while(part){
          let chunk=part;
          while(chunk.length>1 && measure(chunk)>maxWidth)chunk=chunk.slice(0,-1);
          part=part.slice(chunk.length);
          const combined=buffer?buffer+' '+chunk:chunk;
          if(buffer && measure(combined)>maxWidth && write())return yy;
          buffer=buffer?buffer+' '+chunk:chunk;
          if(part && write())return yy;
        }
      }
      if(write())return yy;
    }
    return yy;
  }
  function rect(x,yy,w,h,fill=COLORS.light,stroke=COLORS.rule){ctx.fillStyle=fill;ctx.fillRect(x,yy,w,h);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.strokeRect(x,yy,w,h)}}
  function line(x,yy,end){ctx.strokeStyle=COLORS.rule;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(end,yy);ctx.stroke()}
  function basePage(){
    const canvas=document.createElement('canvas');canvas.width=W*RENDER_SCALE;canvas.height=H*RENDER_SCALE;ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});ctx.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
    page++;
    // Footer is a separate fixed zone: divider, address and contact never overlap.
    ctx.fillStyle='#c92828';ctx.fillRect(margin,H-226,W-margin*2,3);
    // Company identity in both languages, then address and optional contact details.
    const footerName=clean(doc.seller_name||doc.sender_name||doc.company_name);
    const footerArabicName=clean(doc.seller_name_ar||doc.company_name_ar);
    const footerEmail=clean(doc.seller_email||doc.company_email);
    const footerWebsite=clean(doc.seller_website||doc.company_website);
    const contactLine=[footerEmail&&'Email: '+footerEmail,footerWebsite&&'Website: '+footerWebsite].filter(Boolean).join('  |  ');
    // Fixed footer zone, sized from actual content so the contact line stays above page number.
    const footerAddress=clean(doc.seller_address||doc.sender_address||doc.company_address);
    const footerRows=[
      footerName&&[footerName,17,false,true],
      footerArabicName&&[footerArabicName,17,true,true],
      footerAddress&&[footerAddress,14,false,false],
      contactLine&&[contactLine,12,false,false]
    ].filter(Boolean);
    const footerStart=H-198,footerEnd=H-39;
    let footerY=footerStart;
    for(const [value,size,arabicText,bold] of footerRows){
      const remaining=footerEnd-footerY;
      if(remaining<15)break;
      const used=footerWrap(value,footerY,Math.min(size,Math.max(10,remaining/3)),arabicText,bold);
      footerY+=Math.min(used+3,remaining);
    }
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
  // Fit each company name inside its own header column, away from the centered logo.
  // Prefer a single line; use two lines for long names. Never draw beyond the column.
  const companyNameBlock=(value,isArabic=false)=>{
    const content=clean(value).replace(/\s+/g,' ');
    if(!content)return;
    const maxWidth=330;
    const x=isArabic?right:left;
    const align=isArabic?'right':'left';
    const maxFont=isArabic?21:22;
    const minFont=13;
    const measure=(str,size)=>{ctx.save();ctx.font=font(size,true,isArabic);const w=ctx.measureText(str).width;ctx.restore();return w;};
    // Keep short and medium company names on a single line.
    for(let size=maxFont;size>=minFont;size-=0.5){
      if(measure(content,size)<=maxWidth){label(content,x,100,size,true,INK,align,isArabic);return;}
    }
    // For longer names, split at word boundaries into at most two lines.
    const words=content.split(' ');
    let lines=[''];
    for(const word of words){
      const last=lines.length-1;
      const candidate=lines[last]?lines[last]+' '+word:word;
      if(lines[last] && measure(candidate,minFont)>maxWidth && lines.length<2)lines.push(word);
      else lines[last]=candidate;
    }
    // Fit both lines if possible; never let a very long unbroken name hit the logo.
    const fitLine=(line)=>{
      if(measure(line,minFont)<=maxWidth)return line;
      let clipped=line;
      while(clipped.length>1 && measure(clipped+'…',minFont)>maxWidth)clipped=clipped.slice(0,-1);
      return clipped+'…';
    };
    const size=Math.max(minFont,Math.min(maxFont,Math.floor(Math.min(...lines.map(line=>{
      let v=maxFont;
      while(v>minFont && measure(line,v)>maxWidth)v-=0.5;
      return v;
    }))*2)/2));
    lines.slice(0,2).forEach((line,i)=>{
      let shown=line;
      while(shown.length>1 && measure(shown,size)>maxWidth)shown=shown.slice(0,-1);
      if(shown!==line)shown=fitLine(shown);
      label(shown,x,91+i*22,size,true,INK,align,isArabic);
    });
  };
  // Company identity — same positions as the reference page.
  companyNameBlock(doc.seller_name||doc.sender_name||'Company');
  if(doc.seller_cr)label('C.R.: '+doc.seller_cr,left,133,16);
  if(doc.seller_vat)label('VAT: '+doc.seller_vat,left,163,16);
  const sellerAddress=clean(doc.seller_address||doc.sender_address||doc.company_address);
  // Company address appears in footer only; never duplicate it in the top-left header.
  if(logo){const scale=Math.min(350/logo.width,232.25/logo.height);const logoW=logo.width*scale,logoH=logo.height*scale;ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(logo,(W-logoW)/2,52+(145-logoH)/2,logoW,logoH);ctx.restore()}
  companyNameBlock(doc.seller_name_ar||doc.company_name_ar,true);
  const arabicIndicDigits = value => String(value ?? '').replace(/[0-9]/g, digit => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
  if(doc.seller_cr)arabicRight('السجل التجاري: '+arabicIndicDigits(doc.seller_cr),right,133,16);
  if(doc.seller_vat)arabicRight('الرقم الضريبي: '+arabicIndicDigits(doc.seller_vat),right,163,16);
  // Both bilingual titles share one baseline. Fit each half independently.
  const titleY=265;
  const drawTitleHalf=(value,x,align,arabicText=false)=>{
    if(!value)return;
    let size=arabicText?25:29;
    ctx.save();
    while(size>14){ctx.font=font(size,true,arabicText);if(ctx.measureText(value).width<=470)break;size-=0.5;}
    ctx.restore();
    label(value,x,titleY,size,true,INK,align,arabicText);
  };
  if(arabic){drawTitleHalf(heading,W/2-15,'right');drawTitleHalf(arabic,W/2+15,'left',true);}
  else drawTitleHalf(heading,W/2,'center');
  if(draft){ctx.save();ctx.strokeStyle='#c52222';ctx.lineWidth=4;ctx.strokeRect(right-170,274,164,44);label('PREVIEW',right-157,303,25,true,'#c52222');ctx.restore()}
  // Two-column reference-style metadata, not three shaded boxes.
  const metaY=draft?375:345;
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
  // Preserve the six-column blue table; give currency columns sufficient width.
  const col=[left,left+43,left+495,left+591,left+754,left+920,right];
  const gridRow=(yy,height,fill='#fff')=>{rect(left,yy,contentW,height,fill,'#c9c9c9');ctx.strokeStyle='#d3d3d3';ctx.lineWidth=1;for(const x of col.slice(1,-1)){ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x,yy+height);ctx.stroke()}};
  const cellLabel=(text,x,yy,maxWidth,size=15,bold=true,color='#fff',align='left',ar=false)=>{
    let actual=size;
    ctx.save();
    while(actual>9){ctx.font=font(actual,bold,ar);if(ctx.measureText(text).width<=maxWidth)break;actual-=0.5;}
    ctx.restore();
    label(text,x,yy,actual,bold,color,align,ar);
  };
  function tableHeader(){
    const yy=y;rect(left,yy,contentW,92,BLUE,null);
    cellLabel('#',left+8,yy+32,30,16);
    cellLabel('Item / وصف الصنف',left+54,yy+34,col[2]-col[1]-20,17);
    cellLabel('Qty /',col[3]-7,yy+30,col[3]-col[2]-12,15,true,'#fff','right');
    cellLabel('الكمية',col[3]-7,yy+62,col[3]-col[2]-12,14,true,'#fff','right',true);
    cellLabel('Unit Price /',col[4]-7,yy+30,col[4]-col[3]-12,14,true,'#fff','right');
    cellLabel('سعر الوحدة',col[4]-7,yy+62,col[4]-col[3]-12,13,true,'#fff','right',true);
    cellLabel('Taxable Value /',col[5]-7,yy+30,col[5]-col[4]-12,13,true,'#fff','right');
    cellLabel('الخاضع للضريبة',col[5]-7,yy+62,col[5]-col[4]-12,12,true,'#fff','right',true);
    cellLabel('Total Incl. VAT /',right-7,yy+30,right-col[5]-12,13,true,'#fff','right');
    cellLabel('الإجمالي شامل الضريبة',right-7,yy+62,right-col[5]-12,12,true,'#fff','right',true);
    y+=92;
  }
  const newItemPage=()=>{nextPage();y=130;tableHeader();};
  tableHeader();
  const fmt=n=>Number(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
  // Monetary columns use amountText() so the true 2025 symbol cannot be missing.
  items.forEach((item,i)=>{
    const qty=Number(item.quantity||0),price=Number(item.unit_price||0),taxable=itemAmounts[i].taxable,incl=itemAmounts[i].total;
    const desc=clean(item.description||'Item');
    const maxDescWidth=col[2]-col[1]-22;
    ctx.font=font(17);
    const words=desc.split(/\s+/),segments=[];let current='';
    for(const word of words){
      // Split even unbroken long strings so nothing extends past its column.
      let remaining=word;
      while(remaining){
        let piece=remaining;
        while(piece.length>1&&ctx.measureText(piece).width>maxDescWidth)piece=piece.slice(0,-1);
        remaining=remaining.slice(piece.length);
        const candidate=current?current+' '+piece:piece;
        if(current&&ctx.measureText(candidate).width>maxDescWidth){segments.push(current);current=piece;}
        else current=candidate;
      }
    }
    if(current)segments.push(current);
    const rowHeight=Math.max(78,segments.length*32+30);
    if(y+rowHeight>H-244)newItemPage();
    // An unusually tall item can span multiple pages, without clipping its text.
    const linesPerPage=()=>Math.max(1,Math.floor((H-244-y-30)/32));
    let offset=0;
    while(offset<Math.max(segments.length,1)){
      if(y+78>H-244)newItemPage();
      const take=Math.min(linesPerPage(),Math.max(segments.length,1)-offset);
      const h=Math.max(78,take*32+30);
      if(y+h>H-244){newItemPage();continue;}
      gridRow(y,h);
      if(offset===0){
        label(String(i+1),left+10,y+35,16);
        cellLabel(fmt(qty),col[3]-8,y+35,col[3]-col[2]-14,15,false,INK,'right');
        // Keep numbers and their Riyal symbols inside their own table cells.
        const cellMoney=(value,startX,endX)=>
          fittedAmount(value,endX-10,y+38,endX-startX-22,15);
        cellMoney(price,col[3],col[4]);
        cellMoney(taxable,col[4],col[5]);
        cellMoney(incl,col[5],right);
      }
      segments.slice(offset,offset+take).forEach((v,k)=>label(v,left+54,y+35+k*32,17));
      y+=h;offset+=take;
    }
  });
  // Table subtotal row: retain the original grey band and all three labels/amounts,
  // but measure each amount within its own cell instead of letting the two totals collide.
  const CONTENT_BOTTOM=H-244;
  if(y+62>CONTENT_BOTTOM)newItemPage();
  gridRow(y,55,'#d9dce2');
  rightText('Total',col[4]-12,y+35,18,true);
  fittedAmount(subtotal,col[5]-10,y+35,col[5]-col[4]-22,16,true);
  fittedAmount(total,right-10,y+35,right-col[5]-22,16,true);
  y+=70;

  // Preserve the invoice's bilingual totals block and blue Invoice Total band.
  // Captions and amounts are independent columns, measured to fit, with a fixed
  // row height for the English/Arabic pair rather than overlapping baselines.
  const totalsX=505;
  const AMOUNT_START=971;
  const totalCaptionX=totalsX+14;
  const captionWidth=AMOUNT_START-totalCaptionX-24;
  const captionFit=(text,x,baseline,maxWidth,preferred=17,bold=false,color=INK,arabicText=false)=>{
    if(!clean(text))return;
    let size=preferred;
    ctx.save();
    while(size>10){ctx.font=font(size,bold,arabicText);if(ctx.measureText(text).width<=maxWidth)break;size-=0.5;}
    const measured=ctx.measureText(text).width;
    ctx.restore();
    ctx.save();
    if(measured>maxWidth){ctx.translate(x,0);ctx.scale(maxWidth/measured,1);label(text,0,baseline,size,bold,color,'left',arabicText);}
    else label(text,x,baseline,size,bold,color,'left',arabicText);
    ctx.restore();
  };
  // Compact bilingual summary: 20% smaller labels, tighter paired rows.
  const SUMMARY_ROW=53;
  const SUMMARY_HEIGHT=SUMMARY_ROW*3;
  const BLUE_HEIGHT=70;
  const WORDS_HEIGHT=34;
  const TOTALS_BLOCK_HEIGHT=SUMMARY_HEIGHT+BLUE_HEIGHT+WORDS_HEIGHT+14;
  const QR_SIZE=190;
  const QR_ZONE_HEIGHT=248;
  const bankLines=[
    ['Bank Name',doc.bank_name],['A/c Name',doc.bank_account_name],
    ['Account No.',doc.bank_account_number],['IBAN No.',doc.bank_iban],
    ['SWIFT No.',doc.bank_swift]
  ].filter(([,value])=>clean(value));
  const notes=uniqueNotes(doc.notes||doc.remarks||doc.remark);
  const bottomLimit=H-244;
  // A short invoice keeps the totals and lower section on the same page when possible.
  // Long invoices paginate; never push the totals into the fixed footer.
  if(y+TOTALS_BLOCK_HEIGHT+20>bottomLimit){nextPage();y=155;}
  const totalsTop=y;
  const summary=(english,arabicText,value,top)=>{
    captionFit(english,totalCaptionX,top+20,captionWidth,13.6);
    captionFit(arabicText,totalCaptionX,top+41,captionWidth,12,false,INK,true);
    fittedAmount(value,right-12,top+32,right-AMOUNT_START-22,18);
    line(totalsX,top+SUMMARY_ROW-2,right);
  };
  summary('Taxable Amount','المبلغ الخاضع للضريبة',subtotal,totalsTop);
  summary('Total VAT (15%)','إجمالي الضريبة',vat,totalsTop+SUMMARY_ROW);
  summary('Total Including VAT','الإجمالي شامل الضريبة',total,totalsTop+SUMMARY_ROW*2);
  label('Authorized Signatory',left+20,totalsTop+58,17,true);
  const blueY=totalsTop+SUMMARY_HEIGHT+8;
  rect(totalsX-6,blueY,right-totalsX+6,BLUE_HEIGHT,BLUE,null);
  captionFit(proforma?'Proforma Total':'Invoice Total',totalCaptionX,blueY+29,captionWidth,17,true,'#fff');
  captionFit(proforma?'الإجمالي المبدئي':'إجمالي الفاتورة',totalCaptionX,blueY+55,captionWidth,14,true,'#fff',true);
  fittedAmount(total,right-13,blueY+43,right-AMOUNT_START-22,20,true,'#fff');
  captionFit('('+moneyWords(total)+')',totalsX,blueY+BLUE_HEIGHT+26,right-totalsX,13,false,'#555');
  y=totalsTop+TOTALS_BLOCK_HEIGHT;

  // Bank details and remarks start beside the QR, not beneath it.
  // Only move to a new page when the remaining area is genuinely insufficient.
  let lowerTop=y;
  if(lowerTop+72>bottomLimit){nextPage();lowerTop=155;}
  const qx=right-205;
  const leftWidth=invoice?qx-left-22:contentW;
  if(invoice){
    captionFit('QR Code',qx,lowerTop+20,QR_SIZE,14,true);
    const qrAr='رمز الاستجابة السريعة';
    let qrArSize=13;
    ctx.save();while(qrArSize>10){ctx.font=font(qrArSize,true,true);if(ctx.measureText(qrAr).width<=QR_SIZE)break;qrArSize-=0.5;}ctx.restore();
    arabicRight(qrAr,qx+QR_SIZE,lowerTop+45,qrArSize,true);
    if(qr){
      ctx.fillStyle='#fff';ctx.fillRect(qx,lowerTop+56,QR_SIZE,QR_SIZE);
      ctx.drawImage(qr,qx,lowerTop+56,QR_SIZE,QR_SIZE);
    }else{
      rect(qx,lowerTop+56,QR_SIZE,QR_SIZE,'#fff8f5','#e4bcad');
      wrapText('QR unavailable',qx+12,lowerTop+98,QR_SIZE-24,14,true,COLORS.warn);
    }
  }
  let cursor=lowerTop+21;
  let notesWidth=leftWidth;
  const ensureRoom=(height)=>{
    if(cursor+height>bottomLimit){nextPage();cursor=166;notesWidth=contentW;}
  };
  if(bankLines.length){
    ensureRoom(34);
    captionFit('Bank Details / التفاصيل البنكية',left,cursor,notesWidth,16,true);
    cursor+=30;
    for(const [key,value] of bankLines){
      ensureRoom(25);
      captionFit(key+': '+short(value,100),left,cursor,notesWidth,15);
      cursor+=25;
    }
    cursor+=8;
  }
  if(notes){
    ensureRoom(53);
    captionFit('Remarks / Notes / ملاحظات',left,cursor,notesWidth,16,true);
    cursor+=27;
    const noteWords=clean(notes).split(/\s+/);
    const noteMeasure=value=>{ctx.save();ctx.font=font(15);const w=ctx.measureText(value).width;ctx.restore();return w;};
    let lineText='';
    const flush=()=>{
      if(!lineText)return;
      if(cursor+26>bottomLimit){
        nextPage();cursor=166;notesWidth=contentW;
        label('Remarks / Notes (continued)',left,cursor,16,true);
        cursor+=30;
      }
      label(lineText,left,cursor,15);cursor+=26;lineText='';
    };
    for(const word of noteWords){
      let remaining=word;
      while(remaining){
        let piece=remaining;
        while(piece.length>1&&noteMeasure(piece)>notesWidth)piece=piece.slice(0,-1);
        remaining=remaining.slice(piece.length);
        const combined=lineText?lineText+' '+piece:piece;
        if(lineText&&noteMeasure(combined)>notesWidth)flush();
        lineText=lineText?lineText+' '+piece:piece;
        if(remaining)flush();
      }
    }
    flush();
  }
  // QR occupies its own right-hand zone. It does not force bank details or notes down.
  cursor=Math.max(cursor,invoice?lowerTop+QR_ZONE_HEIGHT:cursor);
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