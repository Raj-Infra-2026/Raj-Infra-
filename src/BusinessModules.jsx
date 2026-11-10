import { downloadDocumentPdf, previewDocumentPdf } from './pdfDownload.js';
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X, Save, Eye, Trash2, Download, FileText } from 'lucide-react';
import QRCode from './vendor/qr/index.js';
import QRErrorCorrectLevel from './vendor/qr/QRErrorCorrectLevel.js';

// Show DD/MM/YYYY consistently regardless of browser locale; store ISO YYYY-MM-DD internally.
function InvoiceDateField({ value, onChange, disabled = false, label = 'Invoice Date' }) {
  const format = iso => /^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
  const [draft, setDraft] = useState(format(value));
  const [invalid, setInvalid] = useState(false);
  const picker = React.useRef(null);
  
  useEffect(() => { setDraft(format(value)); setInvalid(false); }, [value]);
  
  const commit = () => {
    const m = draft.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) { setInvalid(true); return; }
    const [, dd, mm, yyyy] = m;
    const iso = `${yyyy}-${mm}-${dd}`;
    const d = new Date(`${iso}T12:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) { setInvalid(true); return; }
    setInvalid(false);
    onChange(iso);
    setDraft(format(iso));
  };
  
  return (
    <label>{label}
      <span className="alif-date-field" style={{display:'flex',alignItems:'center',position:'relative',gap:8}}>
        <input 
          type="text" 
          inputMode="numeric" 
          placeholder="DD/MM/YYYY" 
          aria-label={`${label} (DD/MM/YYYY)`} 
          aria-invalid={invalid} 
          title="Enter date as DD/MM/YYYY" 
          disabled={disabled} 
          required 
          value={draft} 
          onChange={e => { setDraft(e.target.value); setInvalid(false); }} 
          onBlur={commit} 
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} 
          style={{flex:1,minWidth:0}} 
        />
        <input 
          ref={picker} 
          type="date" 
          tabIndex={-1} 
          aria-hidden="true" 
          disabled={disabled} 
          value={value || ''} 
          onChange={e => onChange(e.target.value)} 
          style={{position:'absolute',right:0,width:36,height:36,opacity:0,pointerEvents:'none'}} 
        />
        <button 
          type="button" 
          disabled={disabled} 
          aria-label="Choose date from calendar" 
          title="Choose date" 
          onClick={() => { if (picker.current?.showPicker) picker.current.showPicker(); else picker.current?.focus(); }} 
          style={{flexShrink:0,padding:'8px 10px',border:'1px solid #ddd',borderRadius:8,background:'transparent',cursor:'pointer'}}
        >▦</button>
      </span>
      {invalid && <small role="alert" style={{color:'#b42318'}}>Use a valid date in DD/MM/YYYY format.</small>}
    </label>
  );
}

const capitalizeStart = value => typeof value==='string' ? value.replace(/^(\s*)([a-z])/i,(_,s,c)=>s+c.toUpperCase()) : value;
const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sar = n => Number(n || 0).toLocaleString('en-SA', { style: 'currency', currency: 'SAR' });
const num = n => Math.round((Number(n) || 0) * 100) / 100;
const ADJUSTMENT_TYPES = ['Shipping Charges', 'Convenience Fee', 'Courier Charges', 'Deduction', 'Delivery Charges', 'Gratuity', 'Retention', 'Round Off'];
const adjustmentValue = row => {
    const amount = Number(row.amount || 0);
    return ['Deduction', 'Retention'].includes(row.type) ? -Math.abs(amount) : amount;
};
const adjustmentTotal = rows => num((rows || []).reduce((sum, row) => sum + adjustmentValue(row), 0));

export function invoiceTotals(items, adjustments = []) { 
  const subtotal = num((items || []).reduce((s, x) => s + Number(x.quantity || 0) * Number(x.unit_price || 0), 0)); 
  const vat = num(subtotal * 0.15); 
  return { subtotal, vat, adjustments: adjustmentTotal(adjustments), total: num(subtotal + vat + adjustmentTotal(adjustments)) }; 
}

function words(n) { 
  const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']; 
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']; 
  function say(x) { 
    if (x < 20) return small[x]; 
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + small[x % 10] : ''); 
    if (x < 1000) return small[Math.floor(x / 100)] + ' hundred' + (x % 100 ? ' ' + say(x % 100) : ''); 
    if (x < 1e6) return say(Math.floor(x / 1000)) + ' thousand' + (x % 1000 ? ' ' + say(x % 1000) : ''); 
    if (x < 1e9) return say(Math.floor(x / 1e6)) + ' million' + (x % 1e6 ? ' ' + say(x % 1e6) : ''); 
    return String(x); 
  } 
  const a = Math.floor(Number(n) || 0), b = Math.round(((Number(n) || 0) - a) * 100); 
  return say(a) + ' Saudi riyals' + (b ? ' and ' + say(b) + ' halalas' : '') + ' only'; 
}

const selectedInvoiceDate = doc => {
    const value = String(doc?.date || '');
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return '';
    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return '';
    return `${day}/${month}/${year}`;
};

const displayInvoiceDateTime = doc => {
    const date = selectedInvoiceDate(doc);
    if (!date) return '';
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(doc.invoice_time || '')) ? doc.invoice_time : '';
    if (!time) return date;
    const [hour, minute] = time.split(':');
    const h = Number(hour);
    return `${date}, ${String(h % 12 || 12).padStart(2, '0')}:${minute} ${h >= 12 ? 'PM' : 'AM'}`;
};

const saudiToday = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const saudiTime = () => new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());

export function invoiceQrPayload(doc) {
    if (!doc?.seller_name || !/^[0-9]{15}$/.test(String(doc.seller_vat || ''))) return '';
    // For an unissued invoice preview, reflect the user's selected invoice date/time.
    // Once issued, preserve the genuine issuance timestamp in the ZATCA QR.
    const selectedDate = String(doc.date || '');
    const selectedTime = String(doc.invoice_time || '');
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) && !Number.isNaN(Date.parse(`${selectedDate}T00:00:00Z`));
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(selectedTime);
    const previewTimestamp = validDate && validTime ? `${selectedDate}T${selectedTime}:00+03:00` : '';
    const timestamp = String(doc.invoice_timestamp || doc.issued_at || previewTimestamp || new Date().toISOString());
    const values = [String(doc.seller_name), String(doc.seller_vat), timestamp, num(doc.amount).toFixed(2), num(doc.vat_amount).toFixed(2)];
    const encoder = new TextEncoder();
    const bytes = [];
    values.forEach((value, index) => {
        const encoded = encoder.encode(value);
        if (encoded.length > 255) throw Error('Invoice QR TLV field exceeds 255 bytes');
        bytes.push(index + 1, encoded.length, ...encoded);
    });
    return btoa(String.fromCharCode(...bytes));
}

function qrSvg(payload) { 
  if (!payload) return '';  
  try {
    const qr = new QRCode(0, QRErrorCorrectLevel.M);
    qr.addData(payload);
    qr.make();
    const n = qr.getModuleCount();
    let parts = [];
    for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
            if (qr.isDark(y, x))
                parts.push(`<rect x="${x + 4}" y="${y + 4}" width="1" height="1"/>`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 ${n + 8} ${n + 8}" role="img" aria-label="Invoice QR code"><rect width="100%" height="100%" fill="white"/><g fill="black">${parts.join('')}</g></svg>`;
  } catch {
    return '';
  } 
}

export const invoiceQrMarkup = doc => qrSvg(invoiceQrPayload(doc));

function bilingual(label, arabic) { return `${safe(label)} <span class="ar" lang="ar" dir="rtl">${safe(arabic)}</span>`; }

export function printBusinessDocument(doc, kind = 'Invoices', preview = false, targetWindow = null, htmlOnly = false) {
    const isInvoice = ['Invoices', 'ProformaInvoices'].includes(kind), isProforma = kind === 'ProformaInvoices', items = Array.isArray(doc.items) ? doc.items : [];
    const totals = invoiceTotals(items, doc.adjustments);
    const amount = isInvoice ? Number(doc.amount ?? totals.total) : 0;
    const adjustmentRows = isInvoice ? (doc.adjustments || []).map(row => `<div><span>${safe(row.type)}</span><b>${safe(sar(adjustmentValue(row)))}</b></div>`).join('') : '';
    const qr = kind === 'Invoices' ? qrSvg(invoiceQrPayload({ ...doc, amount, vat_amount: doc.vat_amount ?? totals.vat })) : '';
    const rowItems = items.map((x, i) => isInvoice ? `<tr><td>${i + 1}</td><td class="description-cell">${safe(x.description || '').replace(/\n/g, '<br>')}</td><td>${safe(x.quantity)}</td><td>${safe(sar(x.unit_price))}</td><td>${safe(sar(Number(x.quantity) * Number(x.unit_price)))}</td></tr>` : `<tr><td>${i + 1}</td><td>${safe(x.description || '')}</td><td>${safe(x.quantity)}</td><td>${safe(x.unit || '')}</td><td>${safe(x.remarks || '')}</td></tr>`).join('');
    const sender = isInvoice ? { name: doc.seller_name, address: doc.seller_address, vat: doc.seller_vat, cr: doc.seller_cr, phone: doc.seller_phone, email: doc.seller_email } : { name: doc.sender_name, address: doc.sender_address, vat: doc.sender_vat, cr: doc.sender_cr, phone: doc.sender_phone, email: doc.sender_email };
    const receiver = { name: doc.buyer_name || doc.receiver_name || doc.name, address: doc.buyer_address || doc.receiver_address, vat: doc.buyer_vat || doc.receiver_vat };
    const logo = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(doc.company_logo || '') ? doc.company_logo : '';
    
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${safe(doc.reference || 'Tax Invoice')} - ${isProforma ? 'Proforma Invoice' : isInvoice ? 'Tax Invoice' : 'Delivery Note'}</title><style>
 @page{size:A4;margin:13mm}*{box-sizing:border-box}body{font:12px Arial,Tahoma,'Noto Naskh Arabic',sans-serif;color:#1c2633;background:#fff;margin:0}.ar{font-family:Tahoma,'Noto Naskh Arabic',Arial,sans-serif;direction:rtl;unicode-bidi:isolate;font-size:12px}.company-document-logo{width:76px;height:76px;object-fit:contain;flex-shrink:0;border-radius:8px}.seller-identity{display:flex;align-items:flex-start;gap:12px}.top{display:flex;justify-content:space-between;gap:15px;border-bottom:3px solid #252b3c;padding-bottom:14px}.top h1{font-size:23px;margin:0 0 6px}.top .right{text-align:right}.sub{color:#515969;line-height:1.65}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:13px 0}.meta div{background:#f3f4f8;padding:10px}.label{font-size:10px;color:#586175}.block{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0 16px}.panel{border:1px solid #ccd1da;padding:12px;min-height:94px}.panel h3{font-size:12px;margin:0 0 7px;background:#f1f2f6;padding:6px}.panel p{margin:4px 0;line-height:1.5}.note{font-size:11px;line-height:1.7;margin:12px 0}table{width:100%;border-collapse:collapse;table-layout:auto;margin-top:13px}th{background:#e6e8ed}td,th{border:1px solid #9ea6b3;padding:7px;text-align:left;vertical-align:top;font-size:10px}td:nth-last-child(-n+3){text-align:right}.description-cell{white-space:normal;overflow-wrap:anywhere;line-height:1.5;min-width:220px}thead{display:table-header-group}tr{break-inside:avoid}.bottom{display:flex;justify-content:space-between;gap:20px;margin-top:16px}.totals{width:250px;margin-left:auto}.totals div{display:flex;justify-content:space-between;padding:7px;border-bottom:1px solid #ddd}.totals .grand{font-size:15px;font-weight:bold;background:#e6e8ed}.signature{border:1px solid #aab0bb;min-height:92px;padding:10px;margin-top:24px}.signature p{margin:10px 0}.invoice-notes{margin-top:18px;padding-top:12px;border-top:1px solid #ccd1da;break-inside:avoid}.invoice-notes p{white-space:normal;overflow-wrap:anywhere;line-height:1.6}
 </style></head><body><div class="top"><div class="seller-identity">${logo ? `<img class="company-document-logo" src="${logo}" alt="Company logo"/>` : ''}<div><strong>${safe(sender.name || 'Sender')}</strong><div class="sub">${safe(sender.address || '')}<br/>CR: ${safe(sender.cr || '—')} · VAT: ${safe(sender.vat || '—')}<br/>${safe(sender.phone || '')} ${safe(sender.email || '')}</div></div></div><div class="right"><h1>${bilingual(isProforma ? 'PROFORMA INVOICE' : isInvoice ? 'TAX INVOICE' : 'DELIVERY NOTE', isProforma ? 'فاتورة أولية' : isInvoice ? 'فاتورة ضريبية' : 'مذكرة التسليم')}</h1><strong>${safe(doc.reference || 'INV-001')}</strong></div></div><div class="meta"><div><span class="label">${bilingual(isInvoice ? 'Invoice Date' : 'Delivery Date', isInvoice ? 'تاريخ الفاتورة' : 'تاريخ التسليم')}</span><br/><b>${safe(isInvoice ? displayInvoiceDateTime(doc) : (doc.date || ''))}</b></div><div><span class="label">${bilingual('PO Number', 'رقم أمر الشراء')}</span><br/><b>${safe(doc.po_number || doc.reference_number || '—')}</b></div><div><span class="label">${bilingual('Document Number', 'رقم المستند')}</span><br/><b>${safe(doc.reference || 'INV-001')}</b></div></div><div class="block"><div class="panel"><h3>${bilingual(isInvoice ? 'Seller' : 'Sender', isInvoice ? 'البائع' : 'المرسل')}</h3><p>${safe(sender.name || '')}</p><p>${safe(sender.address || '')}</p><p>VAT: ${safe(sender.vat || '—')}</p></div><div class="panel"><h3>${bilingual(isInvoice ? 'Buyer' : 'Receiver', isInvoice ? 'المشتري' : 'المستلم')}</h3><p>${safe(receiver.name || '')}</p><p>${safe(receiver.address || '')}</p><p>VAT: ${safe(receiver.vat || '—')}</p></div></div>${!isInvoice ? '<div class="note">This delivery note confirms receipt of the goods listed below.<p class="ar" lang="ar" dir="rtl">تؤكد مذكرة التسليم استلام البضائع المدرجة أدناه.</p></div>' : ''}<table><thead><tr><th>#</th>${isInvoice ? `<th style="width:48%">${bilingual('Description', 'الوصف')}</th><th>${bilingual('Qty', 'الكمية')}</th><th>${bilingual('Rate', 'السعر')}</th><th>${bilingual('Total', 'الإجمالي')}</th>` : `<th>${bilingual('Description', 'الوصف')}</th><th>${bilingual('Qty', 'الكمية')}</th><th>${bilingual('Unit', 'الوحدة')}</th><th>${bilingual('Remarks', 'ملاحظات')}</th>`}</tr></thead><tbody>${rowItems}</tbody></table>${isInvoice ? `<div class="bottom"><div>${qr}</div><div class="totals"><div><span>${bilingual('Subtotal', 'المجموع الفرعي')}</span><b>${safe(sar(doc.subtotal ?? totals.subtotal))}</b></div><div><span>${bilingual('VAT 15%', 'ضريبة القيمة المضافة ١٥٪')}</span><b>${safe(sar(doc.vat_amount ?? totals.vat))}</b></div>${adjustmentRows}<div class="grand"><span>${bilingual('Grand Total', 'الإجمالي شامل الضريبة')}</span><b>${safe(sar(amount))}</b></div></div></div><p><b>Amount in words:</b> ${safe(words(amount))}</p>` : `<p class="note">${safe(doc.delivery_instructions || '')}</p>`}${isInvoice ? (String(doc.notes || '').trim() ? `<section class="invoice-notes"><strong>${bilingual('Notes', 'ملاحظات')}</strong><p>${safe(doc.notes).replace(/\n/g, '<br>')}</p></section>` : '') : `<div class="signature"><p>${bilingual('Authorized Signature', 'توقيع المفوض')}: ______________________________</p><p>${bilingual('Receiver Name', 'اسم المستلم')}: ${safe(doc.receiver_name || '____________________________')}</p><p>${bilingual('Receiver Signature', 'توقيع المستلم')}: ______________________________</p><p>${bilingual('Date', 'التاريخ')}: ${safe(doc.receiver_date || '________________')}</p></div>`}</body></html>`;
    
    if (htmlOnly) return html;
    const w = targetWindow || window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to preview or print the document.'); return false; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    return true;
}

const COMPANY_PROFILE_FIELDS = [
    ['name_en', 'Registered Company Name (English)', false],
    ['name_ar', 'Registered Company Name (Arabic)', false],
    ['vat_number', 'Saudi VAT Number (15 digits)', true],
    ['cr_number', 'Commercial Registration (CR)', true],
    ['website', 'Company Website (optional)', false],
    ['address', 'Company Address', false],
    ['city', 'City', false],
    ['district', 'District', false],
    ['postal_code', 'Postal Code', false],
    ['phone', 'Company Phone', false],
    ['email', 'Company Email', false]
];

export function CompanySettingsPage({ request, onChanged }) {
    const [profile, setProfile] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        request('/company-settings')
            .then(data => { if (mounted) setProfile(data.company || {}); })
            .catch(err => { if (mounted) setError(err.message); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    async function save(event) {
        event.preventDefault();
        setMessage('');
        setError('');
        if (!/^\d{15}$/.test(profile.vat_number || '') || !profile.cr_number?.trim()) {
            setError('Company VAT (15 digits) and CR number are required.');
            return;
        }
        setSaving(true);
        try {
            const result = await request('/company-settings', { method: 'PUT', body: JSON.stringify(profile) });
            setProfile(result.company || profile);
            onChanged?.(result.company || profile);
            setMessage('Company details saved successfully.');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function uploadLogo(file){
      if(!file) return;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 3*1024*1024) {
          setError('Choose a PNG, JPG or WebP image under 3 MB.');
          return;
      }
      try {
        const url = URL.createObjectURL(file);
        const image = new Image();
        try { await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url}); } finally { URL.revokeObjectURL(url); }
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 110/Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width*scale));
        canvas.height = Math.max(1, Math.round(image.height*scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/webp', 0.78);
        if(data.length > 45000) throw Error('Logo is too large after resizing.');
        setProfile(old => ({...old, logo_data: data}));
        setError('');
      } catch(e) { setError('Could not process logo: ' + e.message); }
    }

    return (
      <section className="surface-panel company-profile-page">
        <div className="company-profile-intro">
            <div>
                <span className="overline">BUSINESS IDENTITY / TAX INVOICING</span>
                <h2>Registered company profile</h2>
                <p>Enter your seller details used for invoices and QR codes.</p>
            </div>
            <span className="company-profile-lock">Admin only</span>
        </div>
        {loading ? <p className="field-hint">Loading company information…</p> : <form onSubmit={save}>
            <div className="company-logo-upload">
                <div className="company-logo-preview">
                    {profile.logo_data ? <img src={profile.logo_data} alt="Company logo preview"/> : <span>LOGO</span>}
                </div>
                <div>
                    <strong>Company logo</strong>
                    <p>Appears next to your company name. PNG, JPG or WebP.</p>
                    <input aria-label="Upload company logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadLogo(e.target.files?.[0])}/>
                    <button type="button" className="secondary" onClick={()=>setProfile(old=>({...old,logo_data:''}))}>Remove logo</button>
                </div>
            </div>
            <div className="company-profile-fields">
                {COMPANY_PROFILE_FIELDS.map(([key, label, required]) =>
                    <label key={key} className={key === 'address' ? 'profile-wide' : ''}>
                        <span>{label}{required && <b aria-label="required"> *</b>}</span>
                        <input
                            required={required}
                            value={profile[key] || ''}
                            maxLength={key === 'vat_number' ? 15 : 500}
                            type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                            inputMode={key === 'vat_number' ? 'numeric' : undefined}
                            placeholder={key === 'vat_number' ? '15-digit Saudi VAT number' : label}
                            onChange={e => setProfile(current => ({
                                ...current,
                                [key]: key === 'vat_number' ? e.target.value.replace(/\D/g, '').slice(0, 15) : e.target.value
                            }))}
                        />
                    </label>
                )}
            </div>
            <div className="company-profile-fields" style={{marginTop:24}}>
                <div className="profile-wide"><h3>Invoice Number Settings</h3><p>Set the format for future invoices. Existing invoice numbers remain unchanged.</p></div>
                <label><span>Company Prefix</span><input maxLength={12} required pattern="[A-Za-z0-9]{1,12}" value={profile.invoice_prefix ?? 'AP'} onChange={e=>setProfile(v=>({...v,invoice_prefix:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')}))}/></label>
                <label><span>Document Identifier</span><input maxLength={12} required pattern="[A-Za-z0-9]{1,12}" value={profile.invoice_identifier ?? 'INV'} onChange={e=>setProfile(v=>({...v,invoice_identifier:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')}))}/></label>
                <label><span>Starting Sequence Number</span><input type="number" min="1" step="1" max="999999999999" required value={profile.invoice_start_number ?? '1'} onChange={e=>setProfile(v=>({...v,invoice_start_number:e.target.value}))}/></label>
                <label><span>Include Current Year</span><select value={profile.invoice_include_year ?? 'true'} onChange={e=>setProfile(v=>({...v,invoice_include_year:e.target.value}))}><option value="true">Yes</option><option value="false">No</option></select></label>
                <div className="profile-wide"><strong>Example: {(profile.invoice_prefix || 'AP')}-{(profile.invoice_identifier || 'INV')}-{(profile.invoice_include_year ?? 'true') !== 'false' ? new Date().getFullYear() + '-' : ''}{String(Math.max(1,Number(profile.invoice_start_number)||1)).padStart(4,'0')}</strong><p>Numbers continue automatically beyond 9999 and across years. A higher starting number will not reset an existing sequence.</p></div>
            </div>
            {error && <div className="notice error" role="alert">{error}</div>}
            {message && <div className="notice" role="status">{message}</div>}
            <div className="company-profile-footer">
                <button className="primary" disabled={saving} type="submit"><Save size={17}/>{saving ? 'Saving…' : 'Save Company Details'}</button>
            </div>
        </form>}
      </section>
    );
}

const emptyLine = () => ({ description: '', quantity: 1, unit_price: '', unit: 'PCS', remarks: '' });

export function DocumentModal({ kind, editing, clients, role, request, onSaved, close, ClientForm }) {
    const invoice = ['Invoices', 'ProformaInvoices'].includes(kind); 
    const proforma = kind === 'ProformaInvoices';
    const [form, setForm] = useState(() => ({ 
        ...editing, 
        client_id: editing?.client_id || '', 
        name: editing?.name || '', 
        reference: editing?.reference || '', 
        reference_number: editing?.po_number || editing?.reference_number || '', 
        notes: editing?.notes || '', 
        date: editing?.date || saudiToday(), 
        invoice_time: editing?.invoice_time || editing?.invoice_timestamp?.slice(11,16) || saudiTime(), 
        status: editing?.status || 'Active',
        paid_amount: editing?.paid_amount ?? '', 
        seller_name: editing?.seller_name || '', 
        seller_address: editing?.seller_address || '', 
        seller_vat: editing?.seller_vat || '', 
        seller_cr: editing?.seller_cr || '', 
        seller_phone: editing?.seller_phone || '', 
        seller_email: editing?.seller_email || '', 
        company_logo: editing?.company_logo || '', 
        sender_name: editing?.sender_name || '', 
        sender_address: editing?.sender_address || '', 
        sender_vat: editing?.sender_vat || '', 
        sender_cr: editing?.sender_cr || '', 
        sender_phone: editing?.sender_phone || '', 
        sender_email: editing?.sender_email || '', 
        receiver_name: editing?.receiver_name || '', 
        receiver_date: editing?.receiver_date || '', 
        delivery_instructions: editing?.delivery_instructions || '', 
        adjustments: editing?.adjustments || [], 
        items: editing?.items?.length ? editing.items : [emptyLine()] 
    }));
    
    const [clientPoHistory, setClientPoHistory] = useState([]);
    useEffect(() => {
        let cancelled = false;
        const id = form.client_id;
        if(!id){ setClientPoHistory([]); return; }
        Promise.all(['Invoices','Quotations','ProformaInvoices','ClientPOs'].map(t => request('/records/'+t).then(d=>d.records||[])))
            .then(groups => {
                if(!cancelled) setClientPoHistory([...new Set(groups.flat().filter(r => r.client_id === id).map(r => r.po_number || r.reference_number).filter(Boolean))].sort());
            }).catch(() => { if(!cancelled) setClientPoHistory([]); });
        return () => { cancelled = true; };
    }, [form.client_id]);

    const [company, setCompany] = useState(null);
    const [showCompanySettings, setShowCompanySettings] = useState(false);
    const [companySaving, setCompanySaving] = useState(false);
    const [clientList, setClientList] = useState(clients);
    const [clientPopup, setClientPopup] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!invoice) return;
        let cancelled = false;
        request('/company-settings').then(data => {
            if (cancelled) return;
            const profile = data.company || {};
            setCompany(profile);
            setForm(current => ({
                ...current,
                seller_name: current.seller_name || profile.name_en || '',
                seller_vat: current.seller_vat || profile.vat_number || '',
                seller_cr: current.seller_cr || profile.cr_number || '',
                seller_address: current.seller_address || [profile.address, profile.district, profile.city, profile.postal_code].filter(Boolean).join(', '),
                seller_phone: current.seller_phone || profile.phone || '',
                seller_email: current.seller_email || profile.email || '',
                company_logo: current.company_logo || profile.logo_data || ''
            }));
        }).catch(error => { if (!cancelled) setError('Company Settings: ' + error.message); });
        return () => { cancelled = true; };
    }, [invoice]);

    async function saveCompanySettings() {
        setCompanySaving(true);
        setError('');
        try {
            const result = await request('/company-settings', { method: 'PUT', body: JSON.stringify(company) });
            const profile = result.company;
            setCompany(profile);
            setForm(current => ({
                ...current,
                seller_name: profile.name_en,
                seller_vat: profile.vat_number,
                seller_cr: profile.cr_number,
                seller_address: [profile.address, profile.district, profile.city, profile.postal_code].filter(Boolean).join(', '),
                seller_phone: profile.phone,
                seller_email: profile.email,
                company_logo: profile.logo_data || ''
            }));
            setShowCompanySettings(false);
        } catch (error) {
            setError(error.message);
        } finally {
            setCompanySaving(false);
        }
    }

    useEffect(() => setClientList(old => { const known = new Set(old.map(c => c.id)); return [...old, ...clients.filter(c => !known.has(c.id))]; }), [clients]);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setLine = (i, k, v) => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
    const chooseClient = id => { const c = clientList.find(x => x.id === id); setForm(f => ({ ...f, client_id: id, name: c?.name || '', buyer_name: c?.name || '', buyer_address: c?.address || '', buyer_vat: c?.vat_number || '', receiver_name: c?.name || '', receiver_address: c?.address || '', receiver_vat: c?.vat_number || '' })); };
    const totals = useMemo(() => invoiceTotals(form.items, form.adjustments), [form.items, form.adjustments]);
    const paymentNote = form.status === 'Partially Paid' ? `Amount paid: ${sar(Number(form.paid_amount || 0))}. Pending balance: ${sar(Math.max(0, num(totals.total - Number(form.paid_amount || 0))))}.` : '';
    const userNotes = (form.notes || '').replace(/(?:\n|^)(?:Amount paid: SAR [\d,.]+\. Pending balance: SAR [\d,.]+\.)/g, '').trim();
    const finalNotes = [userNotes, paymentNote].filter(Boolean).join('\n');
    const previewRecord = () => ({ ...form, notes: finalNotes, company_logo: form.company_logo || company?.logo_data || '', po_number: form.reference_number || form.po_number || '', reference: form.reference || '', buyer_name: form.buyer_name || form.name, buyer_address: form.buyer_address || clientList.find(x => x.id === form.client_id)?.address || '', buyer_vat: form.buyer_vat || clientList.find(x => x.id === form.client_id)?.vat_number || '', receiver_address: form.receiver_address || clientList.find(x => x.id === form.client_id)?.address || '', receiver_vat: form.receiver_vat || clientList.find(x => x.id === form.client_id)?.vat_number || '', subtotal: totals.subtotal, vat_amount: totals.vat, amount: totals.total });

    async function persist() { 
        setError(''); 
        if (!form.client_id) { setError('Select a client first'); return; } 
        if (!form.items.length || form.items.some(x => !x.description?.trim() || !Number.isFinite(Number(x.quantity)) || Number(x.quantity) <= 0 || (invoice && (!Number.isFinite(Number(x.unit_price)) || Number(x.unit_price) < 0)))) {
            setError('Add a description and a valid positive quantity for every item');
            return;
        } 
        if (invoice && (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.invoice_time || ''))) {
            setError('Select a valid invoice date and time (Saudi Arabia).');
            return;
        } 
        if (invoice && form.status === 'Partially Paid' && (form.paid_amount === '' || !Number.isFinite(Number(form.paid_amount)) || Number(form.paid_amount) <= 0 || Number(form.paid_amount) >= totals.total)) { setError('Enter a paid amount greater than zero and less than the invoice total.'); return; }
        if (invoice && form.items.some(x => String(x.unit_price).trim() === '')) { setError('Enter a rate for every invoice item.'); return; }
        if (invoice && !String(form.seller_name||'').trim()) { setError('Enter the seller company name'); return; } 
        
        setBusy(true); 
        try {
            const payload = editing 
                ? { notes: userNotes, paid_amount: form.paid_amount, items: form.items, status: form.status, ...(kind === 'DeliveryNotes' ? { delivery_instructions: form.delivery_instructions } : {}) } 
                : { ...previewRecord() };
            const path = '/records/' + kind + (editing ? '/' + encodeURIComponent(editing.id) : '');
            const d = await request(path, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
            
            try { 
                await downloadDocumentPdf({ ...d.record, company_logo: d.record.company_logo || company?.logo_data || '' }, kind, kind === 'Invoices' ? invoiceQrMarkup(d.record) : '', 'submitted'); 
            } catch(downloadError) { 
                window.alert('Record submitted, but PDF download failed: ' + downloadError.message); 
                await onSaved(); 
                return; 
            }
            await onSaved();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        } 
    }

    const senderPrefix = invoice ? 'seller' : 'sender';
    const input = (key, label, required = false) => { 
        const phone = key.endsWith('_phone'), email = key.endsWith('_email'); 
        return (
            <label key={key}>{label}
                <input 
                    required={required} 
                    type={phone ? 'tel' : email ? 'email' : 'text'} 
                    inputMode={phone ? 'tel' : undefined} 
                    value={form[key] || ''} 
                    onChange={e => set(key, phone ? e.target.value.replace(/[^+0-9 ()-]/g, '') : email ? e.target.value : e.target.value.replace(/(^|[\s-])\p{L}/gu, m => m.toLocaleUpperCase()))}
                />
            </label>
        ); 
    };

    return (
      <div className="modal-shade" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
        <div className={"record-modal business-modal " + (invoice ? "invoice-redesign" : "delivery-modal")} role="dialog" aria-modal="true" aria-label={invoice ? 'Invoice builder' : 'Delivery note builder'}>
            <div className="modal-header">
                <div>
                    <span className="overline">ALIF LABS / {proforma ? 'PROFORMA BUILDER' : invoice ? 'INVOICE BUILDER' : 'DELIVERY NOTE BUILDER'}</span>
                    <h2>{editing ? 'Edit ' : 'New '}{proforma ? 'Proforma Invoice' : invoice ? 'Invoice' : 'Delivery Note'}</h2>
                </div>
                <button type="button" className="icon-btn" onClick={close}><X /></button>
            </div>
            
            <div className="modal-body">
                <div className="business-section">
                    <div className="section-title">
                        <h3>Client / Receiver</h3>
                        <button type="button" className="secondary" onClick={() => setClientPopup(true)}><Plus size={16}/> Create New Client</button>
                    </div>
                    <label>Select Existing Client
                        <select required value={form.client_id} onChange={e => chooseClient(e.target.value)}>
                            <option value="">Select a client</option>
                            {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>
                    {form.client_id && <p className="field-hint">{clientList.find(x => x.id === form.client_id)?.address || 'No address saved'} · VAT: {clientList.find(x => x.id === form.client_id)?.vat_number || 'Not supplied'}</p>}
                </div>

                <div className="business-section">
                    <h3>Document Details</h3>
                    <div className="form-grid">
                        <label>Document Number<input value={form.reference || 'Automatically assigned on Submit'} readOnly/></label>
                        <InvoiceDateField label={invoice ? "Invoice Date (DD/MM/YYYY)" : "Delivery Date (DD/MM/YYYY)"} value={form.date} onChange={date => set("date", date)} />
                        {invoice && <label>Invoice Time (Saudi Arabia)<input type="time" step="60" required value={form.invoice_time || ''} onChange={e => set('invoice_time', e.target.value)}/></label>}
                        <label>PO Number (optional)
                            <input list="alif-client-po-list" value={form.reference_number||''} onChange={e=>set('reference_number',e.target.value)} placeholder="Enter or select previous client PO"/>
                            <datalist id="alif-client-po-list">{clientPoHistory.map(po=><option key={po} value={po}/>)}</datalist>
                        </label>
                        <label>Status
                            <select value={form.status} onChange={e => set('status', e.target.value)}>
                                {['Active', 'Pending', 'Paid', 'Unpaid', 'Delivered', 'Partially Paid'].map(x => (
                                    <option key={x} value={x}>{x}</option>
                                ))}
                            </select>
                        </label>
                        {invoice && form.status === 'Partially Paid' && <label>Amount Paid (SAR)<input type="number" min="0.01" step="0.01" required value={form.paid_amount} onChange={e => set('paid_amount', e.target.value)} placeholder="Enter amount paid"/><small>Pending balance: {sar(Math.max(0, num(totals.total - Number(form.paid_amount || 0))))}</small></label>}
                    </div>
                </div>

                <div className="business-section">
                    <div className="section-title">
                        <h3>{invoice ? 'Seller Details' : 'Editable Sender Details'}</h3>
                        {invoice && role === 'admin' && <button type="button" className="secondary" onClick={() => setShowCompanySettings(true)}>Company Settings</button>}
                    </div>
                    <div className="form-grid">
                        {input(senderPrefix + '_name', 'Company Name', true)}
                        {input(senderPrefix + '_cr', 'CR Number')}
                        {input(senderPrefix + '_vat', 'VAT Number')}
                        {input(senderPrefix + '_address', 'Address')}
                        {input(senderPrefix + '_phone', 'Phone')}
                        {input(senderPrefix + '_email', 'Email')}
                    </div>
                </div>

                <div className="business-section">
                    <div className="section-title">
                        <div>
                            <h3>Line Items</h3>
                            <p>Enter descriptions and quantities manually{invoice ? ', with rates in SAR.' : '.'}</p>
                        </div>
                        <button type="button" className="secondary" onClick={() => set('items', [...form.items, emptyLine()])}><Plus size={16}/> Add Item</button>
                    </div>
                    {form.items.map((x, i) => (
                        <div className="business-line manual-line" key={i}>
                            <div className="invoice-line-number">Item {i + 1}</div>
                            <label className="description-editor">Description
                                <textarea required rows={3} maxLength={3000} value={x.description || ''} onChange={e => setLine(i, 'description', capitalizeStart(e.target.value))} placeholder="Work description, dimensions, specifications"/>
                            </label>
                            <label>Quantity
                                <input required type="number" min="0.001" step="any" value={x.quantity} onChange={e => setLine(i, 'quantity', e.target.value)}/>
                            </label>
                            {invoice ? (
                                <label>Rate (SAR)
                                    <input required type="number" min="0" step="0.01" value={x.unit_price} onChange={e => setLine(i, 'unit_price', e.target.value)}/>
                                </label>
                            ) : (
                                <>
                                    <label>Unit<input required value={x.unit || ''} onChange={e => setLine(i, 'unit', e.target.value)}/></label>
                                    <label>Remarks<input value={x.remarks || ''} onChange={e => setLine(i, 'remarks', e.target.value)}/></label>
                                </>
                            )}
                            <button type="button" className="icon-btn remove-line" title="Remove item" disabled={form.items.length === 1} onClick={() => set('items', form.items.filter((_, j) => i !== j))}>
                                <Trash2 size={17}/>
                            </button>
                        </div>
                    ))}
                </div>

                {invoice ? (
                    <div className="business-totals">
                        <div className="invoice-summary-title">
                            <h3>Invoice Summary</h3>
                            <p>Review totals and optional adjustments before submitting.</p>
                        </div>
                        <div><span>Subtotal</span><b>{sar(totals.subtotal)}</b></div>
                        <div><span>VAT (15%)</span><b>{sar(totals.vat)}</b></div>
                        <div className="adjustment-editor">
                            <div className="adjustment-heading">
                                <div><strong>Additional Charges / Deductions</strong></div>
                                <button type="button" className="secondary adjustment-add" onClick={() => set('adjustments', [...(form.adjustments || []), { type: 'Shipping Charges', amount: 0 }])}><Plus size={16}/> Add Charge / Deduction</button>
                            </div>
                            {(form.adjustments || []).map((row, i) => (
                                <div className="adjustment-row" key={i}>
                                    <label>Charge / Deduction
                                        <select aria-label="Adjustment type" value={row.type} onChange={e => set('adjustments', form.adjustments.map((r, j) => i === j ? { ...r, type: e.target.value } : r))}>
                                            {ADJUSTMENT_TYPES.map(type => <option key={type}>{type}</option>)}
                                        </select>
                                    </label>
                                    <label>Amount (SAR)
                                        <input aria-label="Adjustment amount in SAR" type="number" step="0.01" value={row.amount} onChange={e => set('adjustments', form.adjustments.map((r, j) => i === j ? { ...r, amount: e.target.value } : r))}/>
                                    </label>
                                    <button type="button" className="icon-btn" aria-label="Remove adjustment" onClick={() => set('adjustments', form.adjustments.filter((_, j) => i !== j))}><X size={16}/></button>
                                </div>
                            ))}
                            <div><span>Adjustments</span><b>{sar(totals.adjustments)}</b></div>
                        </div>
                        <div className="grand"><span>Grand Total</span><b>{sar(totals.total)}</b></div>
                    </div>
                ) : (
                    <div className="business-section">
                        <div className="form-grid">
                            {input('delivery_instructions', 'Delivery Instructions')}
                            {input('receiver_name', 'Receiver Name')}
                            {input('receiver_date', 'Receiver Signature Date')}
                        </div>
                    </div>
                )}

                <div className="business-section">
                    <label className="invoice-notes-field">Notes (optional)
                        <textarea rows={3} maxLength={3000} placeholder="Additional information to display on the invoice PDF" value={form.notes || ''} onChange={e => set('notes', capitalizeStart(e.target.value))}/>
                    </label>
                </div>

                {error && <div className="notice error" role="alert">{error}</div>}
            </div>

            <div className="modal-footer business-footer">
                <button type="button" className="secondary" onClick={close}>Cancel</button>
                <button type="button" className="secondary" onClick={() => previewDocumentPdf(previewRecord(), kind, kind === 'Invoices' ? invoiceQrMarkup(previewRecord()) : '')}>
                    <Eye size={16}/> Preview
                </button>
                <button type="button" className="primary" disabled={busy} onClick={persist}>
                    <Download size={16}/> {busy ? 'Submitting…' : 'Submit'}
                </button>
            </div>
        </div>

        {showCompanySettings && role === 'admin' && (
            <div className="company-settings-overlay" role="presentation">
                <div className="company-settings-panel" role="dialog" aria-modal="true" aria-label="Company Settings">
                    <div className="section-title">
                        <div>
                            <h3>Company Settings</h3>
                            <p>Saved details used on future invoices and QR codes.</p>
                        </div>
                        <button type="button" className="icon-btn" onClick={() => setShowCompanySettings(false)} aria-label="Close Company Settings"><X size={18}/></button>
                    </div>
                    <div className="company-settings-grid">
                        {COMPANY_PROFILE_FIELDS.map(([key, label, required]) => (
                            <label key={key}>{label}
                                <input value={company?.[key] || ''} required={required} maxLength={500} inputMode={key === 'vat_number' ? 'numeric' : key === 'phone' ? 'tel' : undefined} onChange={e => setCompany(current => ({ ...current, [key]: key === 'vat_number' ? e.target.value.replace(/\D/g, '').slice(0, 15) : e.target.value }))}/>
                            </label>
                        ))}
                    </div>
                    <h4>Invoice Number Settings</h4>
                    <div className="company-settings-grid">
                        <label>Company Prefix<input maxLength={12} value={company?.invoice_prefix ?? 'AP'} onChange={e=>setCompany(v=>({...v,invoice_prefix:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')}))}/></label>
                        <label>Invoice Identifier<input maxLength={12} value={company?.invoice_identifier ?? 'INV'} onChange={e=>setCompany(v=>({...v,invoice_identifier:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')}))}/></label>
                        <label>Starting Number<input type="number" min="1" step="1" value={company?.invoice_start_number ?? '1'} onChange={e=>setCompany(v=>({...v,invoice_start_number:e.target.value}))}/></label>
                        <label>Include Year<select value={company?.invoice_include_year ?? 'true'} onChange={e=>setCompany(v=>({...v,invoice_include_year:e.target.value}))}><option value="true">Yes</option><option value="false">No</option></select></label>
                    </div>
                    <p>Example: {(company?.invoice_prefix || 'AP')}-{(company?.invoice_identifier || 'INV')}-{(company?.invoice_include_year ?? 'true') !== 'false' ? new Date().getFullYear() + '-' : ''}{String(Math.max(1,Number(company?.invoice_start_number)||1)).padStart(4,'0')}</p>
                    <div className="company-settings-actions">
                        <button type="button" className="secondary" onClick={() => setShowCompanySettings(false)}>Cancel</button>
                        <button type="button" className="primary" disabled={companySaving || !company?.cr_number || !/^\d{15}$/.test(company?.vat_number || '')} onClick={saveCompanySettings}>
                            {companySaving ? 'Saving…' : 'Save Company Settings'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {clientPopup && (
            <ClientForm role={role} editing={null} busy={busy} close={() => setClientPopup(false)} save={async (data) => { 
                setBusy(true); 
                try {
                    const d = await request('/records/Clients', { method: 'POST', body: JSON.stringify(data) });
                    setClientList(old => [...old, d.record]);
                    chooseClientNew(d.record);
                    setClientPopup(false);
                } catch (e) {
                    setError(e.message);
                } finally {
                    setBusy(false);
                } 
            }}/>
        )}
      </div>
    );

    function chooseClientNew(c) { 
        setForm(f => ({ ...f, client_id: c.id, name: c.name, buyer_name: c.name, buyer_address: c.address || '', buyer_vat: c.vat_number || '', receiver_name: c.name, receiver_address: c.address || '', receiver_vat: c.vat_number || '' })); 
    }
}
