/** Browser-only, per-invoice cryptographic QR experiment.
 * NEVER an issued/cleared invoice or ZATCA compliant signature.
 * WebCrypto P-256 is not the ZATCA secp256k1 signing profile; the hash is raw
 * draft XML rather than the mandated XAdES-transformed canonical XML.
 * Tag 9 is deliberately absent because a real ZATCA CA signature is required.
 */
import { createDraftInvoiceXml } from './zatcaPreview.js';
const te = new TextEncoder();
const tlv = pairs => {
  const bytes=[];
  for(const [tag,value] of pairs){
    if(value.length>255) throw Error(`QR field ${tag} is too long`);
    bytes.push(tag,value.length,...value);
  }
  return btoa(String.fromCharCode(...bytes));
};
export async function buildCryptoTrialQr(doc,kind='standard'){
  if(!['standard','simplified'].includes(kind))throw Error('Choose standard or simplified');
  if(!globalThis.crypto?.subtle)throw Error('Secure HTTPS context required for browser crypto');
  if(!/^3\d{13}3$/.test(String(doc.seller_vat||'')))throw Error('Seller VAT must have valid Saudi 15-digit format');
  const xml=createDraftInvoiceXml(doc,kind);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',te.encode(xml)));
  const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
  const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,te.encode(xml)));
  const valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},keys.publicKey,sig,te.encode(xml));
  if(!valid||sig.length!==64)throw Error('Cryptographic trial signature failed local verification');
  const pub=new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey));
  const amount=Number(doc.amount),vat=Number(doc.vat_amount);
  if(!Number.isFinite(amount)||!Number.isFinite(vat)||amount<0||vat<0)throw Error('Invalid invoice totals');
  const stamp=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
  const qr=tlv([
    [1,te.encode(String(doc.seller_name).trim())],[2,te.encode(String(doc.seller_vat))],
    [3,te.encode(stamp)],[4,te.encode(amount.toFixed(2))],[5,te.encode(vat.toFixed(2))],
    [6,digest],[7,sig],[8,pub]
  ]);
  return {qr,report:{kind,tagCount:8,localSignatureVerified:true,
    algorithm:'ECDSA P-256 / SHA-256 — TEST ONLY',
    hash:'SHA256 of unsigned demo XML; NOT ZATCA canonical invoice hash',
    key:'Ephemeral browser-generated key; NOT ZATCA-issued CSID',
    missing:kind==='simplified'?'ZATCA CA signature tag 9, valid CSID, XAdES, reporting':'ZATCA clearance, returned signed QR, valid CSID, XAdES',
    status:'DRAFT_CRYPTO_EXPERIMENT_NOT_ZATCA_PHASE2_VERIFIED'}};
}
