const pdfDate = v => { const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(v||''));return m ? `${m[3]}/${m[2]}/${m[1]}` : (v||'—'); };
/** Self-contained, client-side PDF exporter (canvas -> JPEG pages -> PDF).
 * No network service or browser print dialog is required. Arabic text uses the
 * browser's installed fonts; the resulting PDF is image-based rather than searchable.
 */
const SAR = amount => 'SAR ' + Number(amount || 0).toLocaleString('en-SA', {minimumFractionDigits:2,maximumFractionDigits:2});
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const money = n => Math.round((Number(n)||0)*100)/100;
function makePdf(images) {
  const encoder = new TextEncoder(); const blocks=[]; let length=0; const offsets=[0];
  const push = bytes => { const b=typeof bytes==='string'?encoder.encode(bytes):bytes; blocks.push(b);length+=b.length; };
  const object=(id, content) => {offsets[id]=length;push(`${id} 0 obj\n`);push(content);push('\nendobj\n');};
  push('%PDF-1.4\n%ALIF\n');
  const kids=images.map((_,i)=>`${3+i*3} 0 R`).join(' ');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,`<< /Type /Pages /Kids [ ${kids} ] /Count ${images.length} >>`);
  images.forEach((bytes,i)=>{
    const page=3+i*3, img=page+1, stream=page+2;
    object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${stream} 0 R >>`);
    offsets[img]=length;push(`${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);push(bytes);push('\nendstream\nendobj\n');
    const content='q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
    object(stream,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  const xref=length;push(`xref\n0 ${images.length*3+3}\n0000000000 65535 f \n`);
  for(let i=1;i<=images.length*3+2;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
  push(`trailer\n<< /Size ${images.length*3+3} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(blocks,{type:'application/pdf'});
}
export async function createDocumentPdfFile(doc,kind='Invoices',qrMarkup='',sharedHtml='') {
  const isInvoice=kind==='Invoices', proforma=kind==='ProformaInvoices';
  const invoiceLike=isInvoice||proforma;
  const title=isInvoice?'TAX INVOICE':proforma?'PROFORMA INVOICE':kind==='Quotations'?'QUOTATION':kind==='DeliveryNotes'?'DELIVERY NOTE':kind==='ClientPOs'?'CLIENT PURCHASE ORDER':'PURCHASE ORDER';
  const arabic=isInvoice?'فاتورة ضريبية':proforma?'فاتورة أولية':kind==='Quotations'?'عرض سعر':kind==='DeliveryNotes'?'إشعار تسليم':'';
  const items=Array.isArray(doc.items)?doc.items:[];
  const subtotal=money(items.reduce((n,x)=>n+Number(x.quantity||0)*Number(x.unit_price||0),0));
  const vat=money(doc.vat_amount??(subtotal*.15));
  const total=money(doc.amount??(subtotal+vat));
  const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;
  const images=[];let ctx,y,page=0;
  const lineMax=1120;
  function newPage(){canvas.width=1240;canvas.height=1754;ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1240,1754);ctx.fillStyle='#24262a';ctx.font='24px Arial,sans-serif';ctx.fillText('ALIF LABS  /  BUSINESS DOCUMENT',60,60);ctx.strokeStyle='#bc3045';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(60,80);ctx.lineTo(1180,80);ctx.stroke();y=115;page++}
  function capture(){ctx.fillStyle='#73737b';ctx.font='18px Arial,sans-serif';ctx.fillText(`ALIF LABS  •  ${title}  •  Page ${page}`,60,1706);const data=canvas.toDataURL('image/jpeg',.88).split(',')[1];const binary=atob(data);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);images.push(bytes)}
  function room(n=42){if(y+n>1640){capture();newPage()}}
  function text(str,options={}){const size=options.size||24,bold=!!options.bold;ctx.font=`${bold?'bold ':''}${size}px Arial, Tahoma, sans-serif`;ctx.fillStyle=options.color||'#24262a'; const value=clean(str);const words=value.split(' ');let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>lineMax && line){room(size+17);ctx.fillText(line,60,y);y+=size+17;line=word;}else line=next}room(size+17);ctx.fillText(line,60,y);y+=size+17;}
  function separator(){room(22);ctx.strokeStyle='#dad9da';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,y);ctx.lineTo(1180,y);ctx.stroke();y+=22;}
  newPage();
  if (/^data:image\/(png|jpeg|webp);base64,/.test(doc.company_logo||'')) {
    try { const logo=new Image(); await new Promise((res,rej)=>{logo.onload=res;logo.onerror=rej;logo.src=doc.company_logo});
      const scale=Math.min(200/logo.naturalWidth,100/logo.naturalHeight);
      ctx.drawImage(logo,60,98,Math.round(logo.naturalWidth*scale),Math.round(logo.naturalHeight*scale)); y=215;
    } catch { /* keep document usable if the saved logo cannot be decoded */ }
  }
  text(doc.seller_name || doc.sender_name || '',{size:26,bold:true});
  text(title,{size:42,bold:true,color:'#ad263e'});if(arabic)text(arabic,{size:27});if(proforma)text('PROFORMA ONLY — NOT A TAX INVOICE',{bold:true,color:'#b02c41'});
  separator();text(`Document No: ${doc.reference||'Pending'}`,{bold:true});text(`Date: ${pdfDate(doc.date)}${doc.invoice_time?'  '+doc.invoice_time+' (Saudi Arabia)':''}`);
  if(doc.po_number||doc.reference_number)text(`PO Number: ${doc.po_number||doc.reference_number}`);
  separator();text(`Seller / Sender: ${doc.seller_name||doc.sender_name||'—'}`);if(doc.seller_cr)text(`CR Number: ${doc.seller_cr}`);if(doc.seller_vat)text(`VAT Number: ${doc.seller_vat}`);
  text(`Client / Receiver: ${doc.buyer_name||doc.receiver_name||doc.name||'—'}`);if(doc.buyer_address||doc.receiver_address)text(`Address: ${doc.buyer_address||doc.receiver_address}`);
  separator();text('DESCRIPTION  |  QTY  |  RATE  |  TOTAL',{size:20,bold:true});separator();
  for(const [index,item] of items.entries()){
    text(`${index+1}. ${item.description||'Item'}`,{size:23});text(`Qty: ${item.quantity||0}  |  Rate: ${SAR(item.unit_price)}  |  Amount: ${SAR(Number(item.quantity||0)*Number(item.unit_price||0))}`,{size:20,color:'#5c606a'});separator();
  }
  if(invoiceLike){text(`Subtotal: ${SAR(doc.subtotal??subtotal)}`,{bold:true});text(`VAT: ${SAR(vat)}`);for(const adj of doc.adjustments||[])text(`${adj.type||'Adjustment'}: ${SAR(adj.amount)}`);text(`Grand Total: ${SAR(total)}`,{size:30,bold:true,color:'#a92139'});}else if(doc.amount)text(`Total: ${SAR(doc.amount)}`,{size:29,bold:true});
  if(doc.notes){separator();text('Notes',{bold:true});text(doc.notes)}
  if(isInvoice && qrMarkup) {
    room(270);
    try {
      const image=new Image();
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrMarkup)});
      ctx.drawImage(image,60,y,220,220);y+=245;
    } catch(error) { throw Error('Could not render the invoice QR in the downloaded PDF: '+error.message); }
  }
  if(isInvoice)text('QR: basic ZATCA TLV format (tags 1-5). Phase 2 compliance requires separate integration.',{size:18,color:'#9a2635'});
  capture(); const filename=`${(doc.reference||kind+'-'+(doc.date||'document')).replace(/[^a-z0-9_-]/gi,'_').slice(0,70)}.pdf`;
  return new File([makePdf(images)], filename, {type:'application/pdf'});
}

export async function downloadDocumentPdf(doc,kind='Invoices',qrMarkup='',sharedHtml='') {
  const file = await createDocumentPdfFile(doc,kind,qrMarkup,sharedHtml);
  const url=URL.createObjectURL(file);
  const link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);return file.name;
}

/** Preview the same generated PDF bytes used by Submit / WhatsApp. */
export async function previewDocumentPdf(doc,kind='Invoices',qrMarkup='') {
  // Open synchronously in response to the user's click to avoid popup blocking.
  const windowRef=window.open('', '_blank');
  if(!windowRef) throw Error('Allow pop-ups to preview the PDF.');
  try {
    windowRef.document.write('<title>Preparing PDF preview</title><body style="font:16px Arial;padding:25px">Preparing PDF preview…</body>');
    const file=await createDocumentPdfFile(doc,kind,qrMarkup);
    const url=URL.createObjectURL(file);
    windowRef.location.replace(url);
    setTimeout(()=>URL.revokeObjectURL(url),5*60*1000);
  } catch(error) {windowRef.close();window.alert('PDF preview failed: '+error.message);throw error}
}
